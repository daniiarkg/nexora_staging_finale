package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/color"
	stddraw "image/draw"
	"image/jpeg"
	_ "image/png"
	"io"
	"log/slog"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/redis/go-redis/v9"
	xdraw "golang.org/x/image/draw"
	_ "golang.org/x/image/webp"

	"nexora/contact-platform/backend/internal/auth"
	"nexora/contact-platform/backend/internal/config"
	"nexora/contact-platform/backend/internal/db"
	"nexora/contact-platform/backend/internal/geo"
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
	created, err := a.createCardWithUniqueSlug(r.Context(), card)
	if err != nil {
		a.logger.Error("card_create_failed", "error", err, "slug", card.Slug, "owner_id", card.OwnerID)
		if isUniqueConstraint(err, "cards_slug_key") {
			httpx.Validation(w, http.StatusBadRequest, "invalid_card_fields", []httpx.FieldError{
				{Field: "slug", Message: "Slug уже занят. Укажите другой slug."},
			})
			return
		}
		httpx.Error(w, http.StatusBadRequest, "card_create_failed")
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"card": created})
}

func (a *app) createCardWithUniqueSlug(ctx context.Context, card models.Card) (models.Card, error) {
	baseSlug := strings.Trim(strings.TrimSpace(card.Slug), "-")
	if baseSlug == "" {
		baseSlug = "card"
	}
	var lastErr error
	for attempt := 0; attempt < 8; attempt++ {
		if attempt > 0 {
			card.Slug = baseSlug + "-" + randomHex(3)
		}
		created, err := a.store.CreateCard(ctx, card)
		if err == nil {
			return created, nil
		}
		if !isUniqueConstraint(err, "cards_slug_key") {
			return models.Card{}, err
		}
		lastErr = err
	}
	return models.Card{}, lastErr
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
	nameKind := kind
	if kind == "contact-photo" {
		optimized, err := optimizeContactPhoto(data)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid_photo")
			return
		}
		data = optimized
		ext = ".jpg"
		nameKind = "photo"
	}
	name := nameKind + "-" + randomHex(16) + ext
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
	card.NameTranslations = normalizeLocalizedText(card.NameTranslations)
	card.Company = strings.TrimSpace(card.Company)
	card.Position = strings.TrimSpace(card.Position)
	card.PositionTranslations = normalizeLocalizedText(card.PositionTranslations)
	card.Email = strings.ToLower(strings.TrimSpace(card.Email))
	card.Website = normalizeURL(card.Website)
	rawSocials := card.Socials
	card.Socials = normalizeSocials(card.Socials)
	card.Address = strings.TrimSpace(card.Address)
	card.AddressGeoURI = geo.NormalizeURI(card.AddressGeoURI)
	if card.AddressGeoURI == "" {
		card.AddressGeoURI = geo.NormalizeURI(card.Address)
	}
	card.Type = defaultString(card.Type, models.CardTypePerson)
	card.Status = defaultString(card.Status, models.StatusDraft)
	card.PreferredLanguage = normalizeLanguage(card.PreferredLanguage)
	card.Slug = slugify(card.Slug)
	if card.Slug == "" {
		card.Slug = slugify(card.Name)
	}
	card.Phones = cleanStrings(card.Phones, 8)
	card.Products = normalizeProducts(card.Products)
	card.CustomFields = normalizeFields(card.CustomFields)
	card.Design = normalizeDesign(card.Design)
	card.VCFButton = normalizeVCFButton(card.VCFButton)
	if fields := validateCard(card, rawSocials); len(fields) > 0 {
		httpx.Validation(w, http.StatusBadRequest, "invalid_card_fields", fields)
		return card, false
	}
	return card, true
}

func validateCard(card models.Card, rawSocials models.Socials) []httpx.FieldError {
	fields := []httpx.FieldError{}
	add := func(field, message string) {
		fields = append(fields, httpx.FieldError{Field: field, Message: message})
	}
	if card.Name == "" {
		if card.Type == models.CardTypeStore {
			add("name", "Название магазина обязательно.")
		} else {
			add("name", "ФИО обязательно.")
		}
	}
	if card.Type == models.CardTypePerson && card.Position == "" {
		add("position", "Должность обязательна для контактной карточки.")
	}
	if len(card.Phones) == 0 {
		add("phones", "Добавьте хотя бы один номер телефона.")
	} else {
		for _, phone := range card.Phones {
			if digitCount(phone) < 5 {
				add("phones", "Номер телефона должен содержать минимум 5 цифр.")
				break
			}
		}
	}
	if card.Email != "" && !validEmail(card.Email) {
		add("email", "Email указан неверно.")
	}
	if card.Website != "" && !validHTTPURL(card.Website) {
		add("website", "Сайт указан неверно. Пример: nexora.kg или https://nexora.kg.")
	}
	if strings.TrimSpace(rawSocials.Instagram) != "" && (hasWhitespace(rawSocials.Instagram) || !validHTTPURL(card.Socials.Instagram)) {
		add("instagram", "Instagram должен быть username или ссылкой без пробелов.")
	}
	if strings.TrimSpace(rawSocials.Telegram) != "" && (hasWhitespace(rawSocials.Telegram) || !validHTTPURL(card.Socials.Telegram)) {
		add("telegram", "Telegram должен быть username или ссылкой без пробелов.")
	}
	if strings.TrimSpace(rawSocials.Whatsapp) != "" {
		if hasWhitespace(rawSocials.Whatsapp) || card.Socials.Whatsapp == "" || !validHTTPURL(card.Socials.Whatsapp) {
			add("whatsapp", "WhatsApp должен быть номером телефона или ссылкой.")
		}
	}
	return fields
}

func validEmail(value string) bool {
	return regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`).MatchString(value)
}

func validHTTPURL(value string) bool {
	parsed, err := url.Parse(value)
	if err != nil || parsed.Host == "" {
		return false
	}
	return parsed.Scheme == "http" || parsed.Scheme == "https"
}

func hasWhitespace(value string) bool {
	return strings.ContainsAny(strings.TrimSpace(value), " \t\r\n")
}

func digitCount(value string) int {
	count := 0
	for _, r := range value {
		if r >= '0' && r <= '9' {
			count++
		}
	}
	return count
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

const (
	contactPhotoSize     = 512
	contactPhotoMaxBytes = 200 * 1024
)

func optimizeContactPhoto(data []byte) ([]byte, error) {
	source, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	square := centerCropSquare(source)
	resized := image.NewRGBA(image.Rect(0, 0, contactPhotoSize, contactPhotoSize))
	stddraw.Draw(resized, resized.Bounds(), &image.Uniform{color.White}, image.Point{}, stddraw.Src)
	xdraw.CatmullRom.Scale(resized, resized.Bounds(), square, square.Bounds(), xdraw.Src, nil)
	return encodeJPEGUnderLimit(resized, contactPhotoMaxBytes)
}

func centerCropSquare(source image.Image) *image.RGBA {
	bounds := source.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	size := width
	if height < size {
		size = height
	}
	left := bounds.Min.X + (width-size)/2
	top := bounds.Min.Y + (height-size)/2
	square := image.NewRGBA(image.Rect(0, 0, size, size))
	stddraw.Draw(square, square.Bounds(), &image.Uniform{color.White}, image.Point{}, stddraw.Src)
	stddraw.Draw(square, square.Bounds(), source, image.Pt(left, top), stddraw.Over)
	return square
}

func encodeJPEGUnderLimit(img image.Image, maxBytes int) ([]byte, error) {
	var last []byte
	for quality := 85; quality >= 5; quality -= 5 {
		buffer := bytes.Buffer{}
		if err := jpeg.Encode(&buffer, img, &jpeg.Options{Quality: quality}); err != nil {
			return nil, err
		}
		last = buffer.Bytes()
		if len(last) <= maxBytes {
			return last, nil
		}
	}
	return nil, fmt.Errorf("optimized contact photo exceeds %d bytes, got %d", maxBytes, len(last))
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
	design.BackgroundType = normalizeBackgroundType(design.BackgroundType)
	design.BackgroundValue = defaultString(design.BackgroundValue, "#edffef")
	design.ButtonColor = defaultString(design.ButtonColor, "#0a844a")
	design.BackgroundMesh = normalizeMeshGradient(design.BackgroundMesh, design.BackgroundValue, design.ButtonColor)
	design.CardBackgroundType = normalizeBackgroundType(design.CardBackgroundType)
	design.CardBackgroundValue = defaultString(design.CardBackgroundValue, defaultString(design.CardColor, "#edffef"))
	design.CardColor = defaultString(design.CardColor, "#edffef")
	design.CardGradientFrom = defaultString(design.CardGradientFrom, design.CardBackgroundValue)
	design.CardGradientTo = defaultString(design.CardGradientTo, design.ButtonColor)
	if design.CardGradientAngle <= 0 {
		design.CardGradientAngle = 135
	}
	design.CardGradientAnimationSpeed = boundedInt(design.CardGradientAnimationSpeed, 10, 3, 40)
	design.CardMesh = normalizeMeshGradient(design.CardMesh, design.CardBackgroundValue, design.ButtonColor)
	design.TextColor = defaultString(design.TextColor, "#030609")
	design.LogoURL = strings.TrimSpace(design.LogoURL)
	if design.LogoMinWidth <= 0 {
		design.LogoMinWidth = 250
	}
	design.TopImageURL = strings.TrimSpace(design.TopImageURL)
	design.BottomImageURL = strings.TrimSpace(design.BottomImageURL)
	design.GradientFrom = defaultString(design.GradientFrom, design.BackgroundValue)
	design.GradientTo = defaultString(design.GradientTo, design.ButtonColor)
	if design.GradientAngle <= 0 {
		design.GradientAngle = 135
	}
	design.GradientAnimationSpeed = boundedInt(design.GradientAnimationSpeed, 10, 3, 40)
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

func normalizeBackgroundType(value string) string {
	switch strings.TrimSpace(value) {
	case "solid", "gradient", "mesh":
		return strings.TrimSpace(value)
	default:
		return "solid"
	}
}

func normalizeLanguage(value string) string {
	switch strings.TrimSpace(value) {
	case models.LanguageRU, models.LanguageEN, models.LanguageKY:
		return strings.TrimSpace(value)
	default:
		return models.LanguageRU
	}
}

func normalizeLocalizedText(values models.LocalizedText) models.LocalizedText {
	out := models.LocalizedText{}
	for _, language := range []string{models.LanguageRU, models.LanguageEN, models.LanguageKY} {
		if value := strings.TrimSpace(values[language]); value != "" {
			out[language] = value
		}
	}
	return out
}

func normalizeSocials(socials models.Socials) models.Socials {
	return models.Socials{
		Instagram: normalizeProfileURL(socials.Instagram, "instagram.com", "https://instagram.com/"),
		Whatsapp:  normalizeWhatsAppURL(socials.Whatsapp),
		Telegram:  normalizeProfileURL(socials.Telegram, "t.me", "https://t.me/"),
		LinkedIn:  normalizeURL(socials.LinkedIn),
	}
}

func normalizeProfileURL(value, domain, prefix string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://") {
		return value
	}
	value = strings.TrimPrefix(value, "@")
	if strings.HasPrefix(value, domain+"/") || strings.HasPrefix(value, "www."+domain+"/") {
		return "https://" + strings.TrimPrefix(value, "www.")
	}
	return prefix + strings.Trim(value, "/")
}

func normalizeWhatsAppURL(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://") {
		return value
	}
	if strings.HasPrefix(value, "wa.me/") || strings.HasPrefix(value, "www.wa.me/") {
		return "https://" + strings.TrimPrefix(value, "www.")
	}
	digits := strings.Builder{}
	for _, r := range value {
		if r >= '0' && r <= '9' {
			digits.WriteRune(r)
		}
	}
	if digits.Len() == 0 {
		return ""
	}
	return "https://wa.me/" + digits.String()
}

func normalizeMeshAnimation(value string) string {
	switch strings.TrimSpace(value) {
	case "none", "drift", "pulse", "orbit", "breathe":
		return strings.TrimSpace(value)
	default:
		return "none"
	}
}

func normalizeColor(value, fallback string) string {
	value = strings.TrimSpace(value)
	if len(value) == 7 && strings.HasPrefix(value, "#") {
		return value
	}
	return fallback
}

func clampedFloat(value, minValue, maxValue float64) float64 {
	if value < minValue {
		return minValue
	}
	if value > maxValue {
		return maxValue
	}
	return value
}

func defaultMeshGradient(primary, secondary string) models.MeshGradientConfig {
	return models.MeshGradientConfig{
		Preset:         "nexora",
		Animation:      "none",
		AnimationSpeed: 10,
		Points: []models.MeshPoint{
			{ID: "p1", X: 18, Y: 22, Color: normalizeColor(primary, "#edffef"), Opacity: 0.92, Radius: 48},
			{ID: "p2", X: 82, Y: 18, Color: normalizeColor(secondary, "#0a844a"), Opacity: 0.58, Radius: 42},
			{ID: "p3", X: 76, Y: 84, Color: "#ffffff", Opacity: 0.72, Radius: 46},
			{ID: "p4", X: 24, Y: 78, Color: "#c4f7d0", Opacity: 0.62, Radius: 38},
		},
	}
}

func normalizeMeshGradient(mesh models.MeshGradientConfig, primary, secondary string) models.MeshGradientConfig {
	mesh.Preset = strings.TrimSpace(mesh.Preset)
	if mesh.Preset == "" {
		mesh.Preset = "custom"
	}
	mesh.Animation = normalizeMeshAnimation(mesh.Animation)
	mesh.AnimationSpeed = boundedInt(mesh.AnimationSpeed, 10, 3, 40)
	if len(mesh.Points) < 3 {
		mesh = defaultMeshGradient(primary, secondary)
	}
	if len(mesh.Points) > 6 {
		mesh.Points = mesh.Points[:6]
	}
	for index := range mesh.Points {
		point := &mesh.Points[index]
		point.ID = strings.TrimSpace(point.ID)
		if point.ID == "" {
			point.ID = fmt.Sprintf("p%d", index+1)
		}
		point.X = clampedFloat(point.X, 0, 100)
		point.Y = clampedFloat(point.Y, 0, 100)
		point.Color = normalizeColor(point.Color, primary)
		point.Opacity = clampedFloat(point.Opacity, 0, 1)
		point.Radius = clampedFloat(point.Radius, 18, 90)
	}
	return mesh
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

var cyrillicSlugMap = map[rune]string{
	'а': "a", 'б': "b", 'в': "v", 'г': "g", 'д': "d", 'е': "e", 'ё': "e",
	'ж': "zh", 'з': "z", 'и': "i", 'й': "i", 'к': "k", 'л': "l", 'м': "m",
	'н': "n", 'о': "o", 'п': "p", 'р': "r", 'с': "s", 'т': "t", 'у': "u",
	'ф': "f", 'х': "h", 'ц': "ts", 'ч': "ch", 'ш': "sh", 'щ': "shch",
	'ъ': "", 'ы': "y", 'ь': "", 'э': "e", 'ю': "yu", 'я': "ya",
	'ң': "n", 'ө': "o", 'ү': "u",
}

func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return ""
	}
	var builder strings.Builder
	lastDash := false
	for _, symbol := range value {
		token := ""
		switch {
		case symbol >= 'a' && symbol <= 'z':
			token = string(symbol)
		case symbol >= '0' && symbol <= '9':
			token = string(symbol)
		default:
			token = cyrillicSlugMap[symbol]
		}
		if token == "" {
			if builder.Len() > 0 && !lastDash {
				builder.WriteByte('-')
				lastDash = true
			}
			continue
		}
		builder.WriteString(token)
		lastDash = false
	}
	value = strings.Trim(builder.String(), "-")
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

func boundedInt(value, fallback, minValue, maxValue int) int {
	if value <= 0 {
		value = fallback
	}
	if value < minValue {
		return minValue
	}
	if value > maxValue {
		return maxValue
	}
	return value
}

func randomHex(size int) string {
	buf := make([]byte, size)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

func isUniqueConstraint(err error, constraint string) bool {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return false
	}
	return pgErr.Code == "23505" && (constraint == "" || pgErr.ConstraintName == constraint)
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
