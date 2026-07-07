package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"

	"nexora/contact-platform/backend/internal/auth"
	"nexora/contact-platform/backend/internal/config"
	"nexora/contact-platform/backend/internal/db"
	"nexora/contact-platform/backend/internal/httpx"
	"nexora/contact-platform/backend/internal/models"
	"nexora/contact-platform/backend/internal/ratelimit"
	"nexora/contact-platform/backend/internal/store"
	"nexora/contact-platform/backend/internal/vcf"
)

type app struct {
	cfg        config.Config
	store      *store.Store
	logger     *slog.Logger
	authLimits *ratelimit.Limiter
}

func main() {
	ctx := context.Background()
	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := cfg.ValidateAuth(); err != nil {
		logger.Error("invalid_auth_config", "error", err)
		os.Exit(1)
	}
	if err := cfg.ValidateValkey(); err != nil {
		logger.Error("invalid_valkey_config", "error", err)
		os.Exit(1)
	}

	valkeyClient, err := newValkeyClient(cfg.ValkeyURL)
	if err != nil {
		logger.Error("valkey_config_failed", "error", err)
		os.Exit(1)
	}
	defer valkeyClient.Close()
	if err := valkeyClient.Ping(ctx).Err(); err != nil {
		logger.Error("valkey_ping_failed", "error", err)
		os.Exit(1)
	}

	pool, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("db_open_failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool, cfg.MigrationsDir); err != nil {
		logger.Error("migration_failed", "error", err)
		os.Exit(1)
	}

	st := store.New(pool)
	rootHash, err := auth.HashPassword(cfg.RootPassword)
	if err != nil {
		logger.Error("root_hash_failed", "error", err)
		os.Exit(1)
	}
	if err := st.EnsureRoot(ctx, rootHash); err != nil {
		logger.Error("root_seed_failed", "error", err)
		os.Exit(1)
	}

	if err := os.MkdirAll(filepath.Join(cfg.StorageDir, "uploads"), 0o755); err != nil {
		logger.Error("storage_failed", "error", err)
		os.Exit(1)
	}

	a := &app{
		cfg:        cfg,
		store:      st,
		logger:     logger,
		authLimits: ratelimit.New(valkeyClient, "nexora_contacts:auth", cfg.AuthRateLimit, cfg.AuthRateWindow),
	}
	server := &http.Server{
		Addr:              cfg.Addr,
		Handler:           a.withCORS(http.HandlerFunc(a.route)),
		ReadHeaderTimeout: 5 * time.Second,
	}
	logger.Info("api_listening", "addr", cfg.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server_failed", "error", err)
		os.Exit(1)
	}
}

func (a *app) route(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.URL.Path == "/health" {
		ctx, cancel := context.WithTimeout(r.Context(), time.Second)
		defer cancel()
		if err := a.authLimits.Ping(ctx); err != nil {
			a.logger.Error("valkey_health_failed", "error", err)
			httpx.Error(w, http.StatusServiceUnavailable, "unhealthy")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	if strings.HasPrefix(r.URL.Path, "/uploads/") {
		http.StripPrefix("/uploads/", http.FileServer(http.Dir(filepath.Join(a.cfg.StorageDir, "uploads")))).ServeHTTP(w, r)
		return
	}

	switch {
	case r.URL.Path == "/api/auth/register" && r.Method == http.MethodPost:
		a.rateLimited(w, r, a.handleRegister)
	case r.URL.Path == "/api/auth/login" && r.Method == http.MethodPost:
		a.rateLimited(w, r, a.handleLogin)
	case r.URL.Path == "/api/auth/logout" && r.Method == http.MethodPost:
		auth.ClearCookie(w)
		httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
	case r.URL.Path == "/api/auth/me" && r.Method == http.MethodGet:
		a.handleMe(w, r)
	case r.URL.Path == "/api/public/settings" && r.Method == http.MethodGet:
		a.handlePublicSettings(w, r)
	case r.URL.Path == "/api/settings" && r.Method == http.MethodGet:
		a.requireSuper(w, r, a.handleSettings)
	case r.URL.Path == "/api/settings" && r.Method == http.MethodPatch:
		a.requireSuper(w, r, a.handleUpdateSettings)
	case r.URL.Path == "/api/uploads" && r.Method == http.MethodPost:
		a.requireSuper(w, r, a.handleUpload)
	case r.URL.Path == "/api/cards" && r.Method == http.MethodGet:
		a.requireSuper(w, r, a.handleListCards)
	case r.URL.Path == "/api/cards" && r.Method == http.MethodPost:
		a.requireSuper(w, r, a.handleCreateCard)
	case strings.HasPrefix(r.URL.Path, "/api/cards/"):
		a.requireSuper(w, r, a.handleCardRoute)
	case r.URL.Path == "/api/designs" && r.Method == http.MethodGet:
		a.requireSuper(w, r, a.handleListDesigns)
	case r.URL.Path == "/api/designs" && r.Method == http.MethodPost:
		a.requireSuper(w, r, a.handleCreateDesign)
	case strings.HasPrefix(r.URL.Path, "/api/designs/"):
		a.requireSuper(w, r, a.handleDesignRoute)
	case strings.HasPrefix(r.URL.Path, "/api/public/cards/"):
		a.handlePublicRoute(w, r)
	default:
		httpx.Error(w, http.StatusNotFound, "not_found")
	}
}

func (a *app) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decode(r, &req); err != nil || strings.TrimSpace(req.Email) == "" || len(req.Password) < 8 {
		httpx.Error(w, http.StatusBadRequest, "invalid_registration")
		return
	}
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "hash_failed")
		return
	}
	user, err := a.store.CreateUser(r.Context(), req.Email, hash)
	if err != nil {
		httpx.Error(w, http.StatusConflict, "user_exists")
		return
	}
	a.issueSession(w, user)
	httpx.JSON(w, http.StatusCreated, map[string]any{"user": user})
}

func (a *app) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decode(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_login")
		return
	}
	user, err := a.store.GetUserByEmail(r.Context(), req.Email)
	if err != nil || !auth.VerifyPassword(user.PasswordHash, req.Password) {
		httpx.Error(w, http.StatusUnauthorized, "invalid_credentials")
		return
	}
	a.issueSession(w, user)
	httpx.JSON(w, http.StatusOK, map[string]any{"user": user})
}

func (a *app) handleMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := a.claimsFromRequest(r)
	if !ok {
		httpx.JSON(w, http.StatusOK, map[string]any{"user": nil})
		return
	}
	user, err := a.store.GetUserByID(r.Context(), claims.Sub)
	if err != nil {
		httpx.JSON(w, http.StatusOK, map[string]any{"user": nil})
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": user})
}

func (a *app) handlePublicSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := a.store.GetSettings(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "settings_failed")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"settings": settings})
}

func (a *app) handleSettings(w http.ResponseWriter, r *http.Request) {
	a.handlePublicSettings(w, r)
}

func (a *app) handleUpdateSettings(w http.ResponseWriter, r *http.Request) {
	var settings models.AppSettings
	if err := decode(r, &settings); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_settings")
		return
	}
	updated, err := a.store.UpdateSettings(r.Context(), settings)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "settings_failed")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"settings": updated})
}

func (a *app) handleListCards(w http.ResponseWriter, r *http.Request) {
	cards, err := a.store.ListCards(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "cards_failed")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"cards": cards})
}

func (a *app) handleCreateCard(w http.ResponseWriter, r *http.Request) {
	claims, _ := a.claimsFromRequest(r)
	card, ok := a.readCard(w, r)
	if !ok {
		return
	}
	card.OwnerID = claims.Sub
	if card.Slug == "" {
		card.Slug = slugify(card.Name) + "-" + randomHex(3)
	}
	created, err := a.store.CreateCard(r.Context(), card)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "card_create_failed")
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"card": created})
}

func (a *app) handleCardRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/cards/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	id := parts[0]
	if id == "" {
		httpx.Error(w, http.StatusNotFound, "not_found")
		return
	}
	if len(parts) == 2 && r.Method == http.MethodPost {
		status := map[string]string{"publish": models.StatusPublished, "unpublish": models.StatusDraft}[parts[1]]
		if status == "" {
			httpx.Error(w, http.StatusNotFound, "not_found")
			return
		}
		card, err := a.store.SetCardStatus(r.Context(), id, status)
		respondStore(w, card, err)
		return
	}
	switch r.Method {
	case http.MethodGet:
		card, err := a.store.GetCard(r.Context(), id)
		respondStore(w, card, err)
	case http.MethodPatch:
		card, ok := a.readCard(w, r)
		if !ok {
			return
		}
		updated, err := a.store.UpdateCard(r.Context(), id, card)
		respondStore(w, updated, err)
	case http.MethodDelete:
		err := a.store.DeleteCard(r.Context(), id)
		if err != nil {
			respondErr(w, err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
	default:
		httpx.Error(w, http.StatusMethodNotAllowed, "method_not_allowed")
	}
}

func (a *app) handlePublicRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/public/cards/")
	if strings.HasSuffix(path, "/vcf") {
		slug := strings.TrimSuffix(path, "/vcf")
		card, err := a.store.GetPublicCardBySlug(r.Context(), slug)
		if err != nil {
			respondErr(w, err)
			return
		}
		body := vcf.Render(card, a.cfg.PublicBaseURL+"/cards/"+card.Slug)
		w.Header().Set("Content-Type", "text/vcard; charset=utf-8")
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.vcf"`, card.Slug))
		_, _ = w.Write([]byte(body))
		return
	}
	if r.Method != http.MethodGet {
		httpx.Error(w, http.StatusMethodNotAllowed, "method_not_allowed")
		return
	}
	card, err := a.store.GetPublicCardBySlug(r.Context(), strings.Trim(path, "/"))
	respondStore(w, card, err)
}

func (a *app) handleUpload(w http.ResponseWriter, r *http.Request) {
	kind := r.URL.Query().Get("kind")
	if kind == "" {
		kind = "photo"
	}
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_upload")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "missing_file")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, 8<<20))
	if err != nil || len(data) == 0 {
		httpx.Error(w, http.StatusBadRequest, "invalid_file")
		return
	}
	ext, ok := allowedUpload(kind, header.Filename, data)
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "unsupported_file_type")
		return
	}
	name := kind + "-" + randomHex(16) + ext
	path := filepath.Join(a.cfg.StorageDir, "uploads", name)
	if err := os.WriteFile(path, data, 0o644); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "upload_failed")
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]string{"url": "/uploads/" + name})
}

func (a *app) handleListDesigns(w http.ResponseWriter, r *http.Request) {
	designs, err := a.store.ListDesigns(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "designs_failed")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"designs": designs})
}

func (a *app) handleCreateDesign(w http.ResponseWriter, r *http.Request) {
	var design models.Design
	if err := decode(r, &design); err != nil || strings.TrimSpace(design.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "invalid_design")
		return
	}
	claims, _ := a.claimsFromRequest(r)
	design.OwnerID = claims.Sub
	created, err := a.store.CreateDesign(r.Context(), design)
	respondDesign(w, created, err, http.StatusCreated)
}

func (a *app) handleDesignRoute(w http.ResponseWriter, r *http.Request) {
	id := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/designs/"), "/")
	switch r.Method {
	case http.MethodGet:
		design, err := a.store.GetDesign(r.Context(), id)
		respondDesign(w, design, err, http.StatusOK)
	case http.MethodPatch:
		var design models.Design
		if err := decode(r, &design); err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid_design")
			return
		}
		updated, err := a.store.UpdateDesign(r.Context(), id, design)
		respondDesign(w, updated, err, http.StatusOK)
	case http.MethodDelete:
		err := a.store.DeleteDesign(r.Context(), id)
		if err != nil {
			respondErr(w, err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
	default:
		httpx.Error(w, http.StatusMethodNotAllowed, "method_not_allowed")
	}
}

func (a *app) readCard(w http.ResponseWriter, r *http.Request) (models.Card, bool) {
	var card models.Card
	if err := decode(r, &card); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_card")
		return card, false
	}
	card.Name = strings.TrimSpace(card.Name)
	card.Company = strings.TrimSpace(card.Company)
	card.Position = strings.TrimSpace(card.Position)
	card.Email = strings.ToLower(strings.TrimSpace(card.Email))
	card.Website = normalizeURL(card.Website)
	card.Address = strings.TrimSpace(card.Address)
	card.Type = defaultString(card.Type, models.CardTypePerson)
	card.Status = defaultString(card.Status, models.StatusDraft)
	card.Slug = slugify(card.Slug)
	if card.Slug == "" {
		card.Slug = slugify(card.Name)
	}
	card.Phones = cleanStrings(card.Phones, 8)
	card.Products = normalizeProducts(card.Products)
	card.CustomFields = normalizeFields(card.CustomFields)
	card.Design = normalizeDesign(card.Design)
	card.VCFButton = normalizeVCFButton(card.VCFButton)
	if card.Name == "" || len(card.Phones) == 0 || (card.Type == models.CardTypePerson && card.Position == "") {
		httpx.Error(w, http.StatusBadRequest, "missing_required_fields")
		return card, false
	}
	return card, true
}

func (a *app) issueSession(w http.ResponseWriter, user models.User) {
	token, _ := auth.Sign(a.cfg.SessionSecret, auth.Claims{Sub: user.ID, Role: user.Role, Exp: time.Now().Add(a.cfg.SessionTTL).Unix()})
	auth.SetCookie(w, token, a.cfg.SessionTTL)
}

func (a *app) claimsFromRequest(r *http.Request) (auth.Claims, bool) {
	cookie, err := r.Cookie(auth.CookieName)
	if err != nil {
		return auth.Claims{}, false
	}
	claims, err := auth.Verify(a.cfg.SessionSecret, cookie.Value)
	return claims, err == nil
}

func (a *app) requireSuper(w http.ResponseWriter, r *http.Request, next http.HandlerFunc) {
	claims, ok := a.claimsFromRequest(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if claims.Role != models.RoleSuperUser {
		httpx.Error(w, http.StatusForbidden, "forbidden")
		return
	}
	next(w, r)
}

func (a *app) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		for _, allowed := range a.cfg.CORSOrigins {
			if origin == allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
				w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
				break
			}
		}
		next.ServeHTTP(w, r)
	})
}

func (a *app) rateLimited(w http.ResponseWriter, r *http.Request, next http.HandlerFunc) {
	allowed, err := a.authLimits.Allow(r.Context(), clientIP(r))
	if err != nil {
		a.logger.Error("rate_limit_failed", "error", err)
		httpx.Error(w, http.StatusServiceUnavailable, "rate_limit_unavailable")
		return
	}
	if !allowed {
		httpx.Error(w, http.StatusTooManyRequests, "rate_limited")
		return
	}
	next(w, r)
}

func decode(r *http.Request, dst any) error {
	defer r.Body.Close()
	return json.NewDecoder(io.LimitReader(r.Body, 2<<20)).Decode(dst)
}

func respondStore(w http.ResponseWriter, card models.Card, err error) {
	if err != nil {
		respondErr(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"card": card})
}

func respondDesign(w http.ResponseWriter, design models.Design, err error, status int) {
	if err != nil {
		respondErr(w, err)
		return
	}
	httpx.JSON(w, status, map[string]any{"design": design})
}

func respondErr(w http.ResponseWriter, err error) {
	if errors.Is(err, store.ErrNotFound) {
		httpx.Error(w, http.StatusNotFound, "not_found")
		return
	}
	httpx.Error(w, http.StatusInternalServerError, "server_error")
}

func allowedUpload(kind, filename string, data []byte) (string, bool) {
	ext := strings.ToLower(filepath.Ext(filename))
	if kind == "logo" && ext == ".svg" && looksLikeSVG(data) {
		return ".svg", true
	}
	contentType := http.DetectContentType(data)
	extensions, _ := mime.ExtensionsByType(contentType)
	if len(extensions) == 0 {
		return "", false
	}
	if contentType == "image/png" || contentType == "image/jpeg" || contentType == "image/webp" {
		if contentType == "image/jpeg" {
			return ".jpg", true
		}
		return extensions[0], true
	}
	return "", false
}

func looksLikeSVG(data []byte) bool {
	text := strings.ToLower(string(data))
	return strings.Contains(text, "<svg") && !strings.Contains(text, "<script")
}

func normalizeProducts(products []models.Product) []models.Product {
	out := make([]models.Product, 0, len(products))
	for index, product := range products {
		product.Title = strings.TrimSpace(product.Title)
		product.Price = strings.TrimSpace(product.Price)
		product.PhotoURL = strings.TrimSpace(product.PhotoURL)
		product.SortOrder = index
		if product.Title != "" {
			out = append(out, product)
		}
	}
	return out
}

func normalizeFields(fields []models.CustomField) []models.CustomField {
	out := make([]models.CustomField, 0, len(fields))
	for index, field := range fields {
		field.Label = strings.TrimSpace(field.Label)
		field.Value = strings.TrimSpace(field.Value)
		field.Type = defaultString(field.Type, "text")
		field.SortOrder = index
		if field.Label != "" && field.Value != "" {
			out = append(out, field)
		}
	}
	return out
}

func normalizeDesign(design models.DesignConfig) models.DesignConfig {
	design.BackgroundType = defaultString(design.BackgroundType, "solid")
	design.BackgroundValue = defaultString(design.BackgroundValue, "#edffef")
	design.CardColor = defaultString(design.CardColor, "#edffef")
	design.ButtonColor = defaultString(design.ButtonColor, "#0a844a")
	design.TextColor = defaultString(design.TextColor, "#030609")
	design.LogoURL = strings.TrimSpace(design.LogoURL)
	design.GradientFrom = defaultString(design.GradientFrom, design.BackgroundValue)
	design.GradientTo = defaultString(design.GradientTo, design.ButtonColor)
	if design.GradientAngle <= 0 {
		design.GradientAngle = 135
	}
	design.FontFamily = defaultString(design.FontFamily, "system")
	if design.FontWeight <= 0 {
		design.FontWeight = 700
	}
	if design.FontSize <= 0 {
		design.FontSize = 100
	}
	design.Layout = defaultString(design.Layout, "custom")
	return design
}

func normalizeVCFButton(button models.VCFButton) models.VCFButton {
	if strings.TrimSpace(button.Label) == "" {
		button.Label = "Скачать VCF"
		button.Enabled = true
	}
	button.Label = strings.TrimSpace(button.Label)
	return button
}

func cleanStrings(values []string, limit int) []string {
	out := []string{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			out = append(out, value)
		}
		if len(out) == limit {
			break
		}
	}
	return out
}

func normalizeURL(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if !strings.HasPrefix(value, "http://") && !strings.HasPrefix(value, "https://") {
		value = "https://" + value
	}
	return value
}

func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = regexp.MustCompile(`[^a-z0-9а-яё]+`).ReplaceAllString(value, "-")
	value = strings.Trim(value, "-")
	if value == "" {
		return "card"
	}
	return value
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func randomHex(size int) string {
	buf := make([]byte, size)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

func newValkeyClient(rawURL string) (*redis.Client, error) {
	options, err := redis.ParseURL(rawURL)
	if err != nil {
		return nil, err
	}
	options.DialTimeout = 2 * time.Second
	options.ReadTimeout = time.Second
	options.WriteTimeout = time.Second
	options.PoolSize = 10
	options.MinIdleConns = 2
	return redis.NewClient(options), nil
}

func clientIP(r *http.Request) string {
	if forwardedFor := r.Header.Get("X-Forwarded-For"); forwardedFor != "" {
		for _, part := range strings.Split(forwardedFor, ",") {
			if ip := strings.TrimSpace(part); ip != "" {
				return ip
			}
		}
	}
	if realIP := strings.TrimSpace(r.Header.Get("X-Real-IP")); realIP != "" {
		return realIP
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
