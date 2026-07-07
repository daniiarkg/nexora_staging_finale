package store

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"nexora/contact-platform/backend/internal/geo"
	"nexora/contact-platform/backend/internal/models"
)

var ErrNotFound = errors.New("not found")

type Store struct {
	db *pgxpool.Pool
}

func New(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

func defaultAppSettings() models.AppSettings {
	logo := "/nexora-text-logo.svg"
	return models.AppSettings{
		FaviconURL:            logo,
		LandingLogoURL:        logo,
		LandingEyebrow:        "Nexora Contacts",
		LandingTitle:          "Контактные карточки и мини-витрины без лишней возни.",
		LandingLead:           "Публичные ссылки, VCF, несколько телефонов, товары, кастомный дизайн и предпросмотр в одном аккуратном рабочем интерфейсе.",
		LandingPrimaryLabel:   "Войти",
		LandingPrimaryHref:    "/login",
		LandingSecondaryLabel: "Регистрация",
		LandingSecondaryHref:  "/register",
		LandingFeatures:       []string{"Person cards", "Store catalog", "VCF export"},
		LandingCard: models.Card{
			Slug:          "demo",
			Type:          models.CardTypePerson,
			Status:        models.StatusPublished,
			Name:          "Айбек Осмонов",
			Position:      "AI Operations Consultant",
			Company:       "Nexora Group",
			Email:         "demo@nexora.kg",
			Website:       "https://nexora.kg",
			Address:       "Бишкек",
			AddressGeoURI: "geo:42.8746,74.5698",
			Phones:        []string{"+996 555 123 456"},
			Socials:       models.Socials{Telegram: "https://t.me/nexora"},
			Design: models.DesignConfig{
				BackgroundType:   "solid",
				BackgroundValue:  "#edffef",
				CardColor:        "#edffef",
				ButtonColor:      "#0a844a",
				TextColor:        "#030609",
				LogoURL:          logo,
				GradientFrom:     "#edffef",
				GradientTo:       "#0a844a",
				GradientAngle:    135,
				GradientAnimated: false,
				FontFamily:       "system",
				FontWeight:       700,
				FontSize:         100,
				Layout:           "custom",
				Watermark:        true,
			},
			VCFButton:    models.VCFButton{Enabled: true, Label: "Сохранить контакт"},
			CustomFields: []models.CustomField{{Label: "Office", Value: "Mon-Fri, 10:00-18:00", Type: "text"}},
			Products:     []models.Product{},
		},
	}
}

func (s *Store) EnsureRoot(ctx context.Context, passwordHash string) error {
	_, err := s.db.Exec(ctx, `
		INSERT INTO users (email, password_hash, role)
		VALUES ('root', $1, 'super_user')
		ON CONFLICT (email) DO UPDATE
		SET password_hash = EXCLUDED.password_hash,
		    role = 'super_user',
		    updated_at = now()
	`, passwordHash)
	return err
}

func (s *Store) EnsureDesignPresets(ctx context.Context) error {
	presets := []models.Design{
		{
			Name:            "Nexora green default",
			BackgroundType:  "solid",
			BackgroundValue: "#edffef",
			CardColor:       "#edffef",
			ButtonColor:     "#0a844a",
			TextColor:       "#030609",
			Layout:          "nexora_default",
			Watermark:       true,
		},
		{
			Name:            "White",
			BackgroundType:  "solid",
			BackgroundValue: "#f4f4f5",
			CardColor:       "#ffffff",
			ButtonColor:     "#111111",
			TextColor:       "#111111",
			Layout:          "white",
			Watermark:       false,
		},
		{
			Name:            "Dark",
			BackgroundType:  "solid",
			BackgroundValue: "#080808",
			CardColor:       "#000000",
			ButtonColor:     "#ffffff",
			TextColor:       "#f4f4f5",
			Layout:          "dark",
			Watermark:       false,
		},
	}
	for _, preset := range presets {
		_, err := s.db.Exec(ctx, `
			INSERT INTO designs (name, background_type, background_value, card_color, button_color, text_color, layout, watermark)
			SELECT $1,$2,$3,$4,$5,$6,$7,$8
			WHERE NOT EXISTS (
				SELECT 1 FROM designs WHERE owner_id IS NULL AND layout=$7
			)
		`, preset.Name, preset.BackgroundType, preset.BackgroundValue, preset.CardColor, preset.ButtonColor, preset.TextColor, preset.Layout, preset.Watermark)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) GetSettings(ctx context.Context) (models.AppSettings, error) {
	settings := defaultAppSettings()
	rows, err := s.db.Query(ctx, `SELECT key, value FROM app_settings`)
	if err != nil {
		return settings, err
	}
	defer rows.Close()

	values := map[string]string{}
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return settings, err
		}
		values[key] = value
	}
	if err := rows.Err(); err != nil {
		return settings, err
	}

	settings.DefaultLogoURL = strings.TrimSpace(values["default_logo_url"])
	if value, ok := values["favicon_url"]; ok {
		settings.FaviconURL = value
	}
	if value, ok := values["landing_logo_url"]; ok {
		settings.LandingLogoURL = value
	} else if settings.DefaultLogoURL != "" {
		settings.LandingLogoURL = settings.DefaultLogoURL
	}
	if value, ok := values["landing_eyebrow"]; ok {
		settings.LandingEyebrow = value
	}
	if value, ok := values["landing_title"]; ok {
		settings.LandingTitle = value
	}
	if value, ok := values["landing_lead"]; ok {
		settings.LandingLead = value
	}
	if value, ok := values["landing_primary_label"]; ok {
		settings.LandingPrimaryLabel = value
	}
	if value, ok := values["landing_primary_href"]; ok {
		settings.LandingPrimaryHref = value
	}
	if value, ok := values["landing_secondary_label"]; ok {
		settings.LandingSecondaryLabel = value
	}
	if value, ok := values["landing_secondary_href"]; ok {
		settings.LandingSecondaryHref = value
	}
	if value := strings.TrimSpace(values["landing_features"]); value != "" {
		_ = json.Unmarshal([]byte(value), &settings.LandingFeatures)
	}
	if value := strings.TrimSpace(values["landing_card"]); value != "" {
		_ = json.Unmarshal([]byte(value), &settings.LandingCard)
	}
	return normalizeAppSettings(settings), nil
}

func (s *Store) UpdateSettings(ctx context.Context, settings models.AppSettings) (models.AppSettings, error) {
	settings = normalizeAppSettings(settings)
	features, _ := json.Marshal(settings.LandingFeatures)
	landingCard, _ := json.Marshal(settings.LandingCard)
	values := map[string]string{
		"favicon_url":             settings.FaviconURL,
		"landing_logo_url":        settings.LandingLogoURL,
		"landing_eyebrow":         settings.LandingEyebrow,
		"landing_title":           settings.LandingTitle,
		"landing_lead":            settings.LandingLead,
		"landing_primary_label":   settings.LandingPrimaryLabel,
		"landing_primary_href":    settings.LandingPrimaryHref,
		"landing_secondary_label": settings.LandingSecondaryLabel,
		"landing_secondary_href":  settings.LandingSecondaryHref,
		"landing_features":        string(features),
		"landing_card":            string(landingCard),
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return models.AppSettings{}, err
	}
	defer tx.Rollback(ctx)
	for key, value := range values {
		if _, err := tx.Exec(ctx, `
			INSERT INTO app_settings (key, value, updated_at)
			VALUES ($1, $2, now())
			ON CONFLICT (key) DO UPDATE
			SET value=EXCLUDED.value,
			    updated_at=now()
		`, key, value); err != nil {
			return models.AppSettings{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return models.AppSettings{}, err
	}
	return s.GetSettings(ctx)
}

func (s *Store) CreateUser(ctx context.Context, email, passwordHash string) (models.User, error) {
	var user models.User
	err := s.db.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, role)
		VALUES ($1, $2, 'user')
		RETURNING id::text, email, password_hash, role, created_at, updated_at
	`, strings.ToLower(strings.TrimSpace(email)), passwordHash).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.CreatedAt, &user.UpdatedAt)
	return user, err
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (models.User, error) {
	var user models.User
	err := s.db.QueryRow(ctx, `
		SELECT id::text, email, password_hash, role, created_at, updated_at
		FROM users WHERE email=$1
	`, strings.ToLower(strings.TrimSpace(email))).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.CreatedAt, &user.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return user, ErrNotFound
	}
	return user, err
}

func (s *Store) GetUserByID(ctx context.Context, id string) (models.User, error) {
	var user models.User
	err := s.db.QueryRow(ctx, `
		SELECT id::text, email, password_hash, role, created_at, updated_at
		FROM users WHERE id=$1
	`, id).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.CreatedAt, &user.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return user, ErrNotFound
	}
	return user, err
}

func (s *Store) ListCards(ctx context.Context) ([]models.Card, error) {
	rows, err := s.db.Query(ctx, cardSelect()+` ORDER BY cards.updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cards, err := scanCards(rows)
	if err != nil {
		return nil, err
	}
	for index := range cards {
		if err := s.AttachProducts(ctx, &cards[index]); err != nil {
			return nil, err
		}
	}
	return cards, nil
}

func (s *Store) GetCard(ctx context.Context, id string) (models.Card, error) {
	rows, err := s.db.Query(ctx, cardSelect()+` WHERE cards.id=$1`, id)
	if err != nil {
		return models.Card{}, err
	}
	defer rows.Close()
	cards, err := scanCards(rows)
	if err != nil {
		return models.Card{}, err
	}
	if len(cards) == 0 {
		return models.Card{}, ErrNotFound
	}
	if err := s.AttachProducts(ctx, &cards[0]); err != nil {
		return models.Card{}, err
	}
	return cards[0], nil
}

func (s *Store) GetPublicCardBySlug(ctx context.Context, slug string) (models.Card, error) {
	rows, err := s.db.Query(ctx, cardSelect()+` WHERE cards.slug=$1 AND cards.status='published'`, slug)
	if err != nil {
		return models.Card{}, err
	}
	defer rows.Close()
	cards, err := scanCards(rows)
	if err != nil {
		return models.Card{}, err
	}
	if len(cards) == 0 {
		return models.Card{}, ErrNotFound
	}
	if err := s.AttachProducts(ctx, &cards[0]); err != nil {
		return models.Card{}, err
	}
	return cards[0], nil
}

func (s *Store) CreateCard(ctx context.Context, card models.Card) (models.Card, error) {
	phones, socials, design, vcfButton, fields := jsonValues(card)
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return models.Card{}, err
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx, `
		INSERT INTO cards (
			owner_id, slug, type, status, name, position, company, email, website, address, address_geo_uri,
			phones, socials, photo_url, logo_url, hide_logo, design_id, design_config, vcf_button, custom_fields
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NULLIF($17,'')::uuid,$18,$19,$20)
		RETURNING id::text, created_at, updated_at, published_at
	`, card.OwnerID, card.Slug, card.Type, defaultString(card.Status, models.StatusDraft), card.Name, card.Position, card.Company, card.Email, card.Website, card.Address, card.AddressGeoURI, phones, socials, card.PhotoURL, card.LogoURL, card.HideLogo, card.DesignID, design, vcfButton, fields).Scan(&card.ID, &card.CreatedAt, &card.UpdatedAt, &card.PublishedAt)
	if err != nil {
		return models.Card{}, err
	}
	if err := replaceProducts(ctx, tx, card.ID, card.Products); err != nil {
		return models.Card{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.Card{}, err
	}
	return s.GetCard(ctx, card.ID)
}

func (s *Store) UpdateCard(ctx context.Context, id string, card models.Card) (models.Card, error) {
	phones, socials, design, vcfButton, fields := jsonValues(card)
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return models.Card{}, err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE cards
		SET slug=$2, type=$3, status=$4, name=$5, position=$6, company=$7, email=$8,
		    website=$9, address=$10, address_geo_uri=$11, phones=$12, socials=$13, photo_url=$14, logo_url=$15,
		    hide_logo=$16, design_id=NULLIF($17,'')::uuid, design_config=$18,
		    vcf_button=$19, custom_fields=$20, updated_at=now()
		WHERE id=$1
	`, id, card.Slug, card.Type, defaultString(card.Status, models.StatusDraft), card.Name, card.Position, card.Company, card.Email, card.Website, card.Address, card.AddressGeoURI, phones, socials, card.PhotoURL, card.LogoURL, card.HideLogo, card.DesignID, design, vcfButton, fields)
	if err != nil {
		return models.Card{}, err
	}
	if tag.RowsAffected() == 0 {
		return models.Card{}, ErrNotFound
	}
	if err := replaceProducts(ctx, tx, id, card.Products); err != nil {
		return models.Card{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.Card{}, err
	}
	return s.GetCard(ctx, id)
}

func (s *Store) DeleteCard(ctx context.Context, id string) error {
	tag, err := s.db.Exec(ctx, `DELETE FROM cards WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) SetCardStatus(ctx context.Context, id, status string) (models.Card, error) {
	var publishedAt any
	if status == models.StatusPublished {
		publishedAt = time.Now()
	}
	tag, err := s.db.Exec(ctx, `
		UPDATE cards
		SET status=$2, published_at=$3, updated_at=now()
		WHERE id=$1
	`, id, status, publishedAt)
	if err != nil {
		return models.Card{}, err
	}
	if tag.RowsAffected() == 0 {
		return models.Card{}, ErrNotFound
	}
	return s.GetCard(ctx, id)
}

func (s *Store) ListDesigns(ctx context.Context) ([]models.Design, error) {
	rows, err := s.db.Query(ctx, `SELECT id::text, COALESCE(owner_id::text,''), name, background_type, background_value, card_color, button_color, text_color, logo_url, gradient_from, gradient_to, gradient_angle, gradient_animated, font_family, font_weight, font_size, layout, watermark, created_at, updated_at FROM designs ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanDesigns(rows)
}

func (s *Store) GetDesign(ctx context.Context, id string) (models.Design, error) {
	var out models.Design
	err := s.db.QueryRow(ctx, `SELECT id::text, COALESCE(owner_id::text,''), name, background_type, background_value, card_color, button_color, text_color, logo_url, gradient_from, gradient_to, gradient_angle, gradient_animated, font_family, font_weight, font_size, layout, watermark, created_at, updated_at FROM designs WHERE id=$1`, id).
		Scan(&out.ID, &out.OwnerID, &out.Name, &out.BackgroundType, &out.BackgroundValue, &out.CardColor, &out.ButtonColor, &out.TextColor, &out.LogoURL, &out.GradientFrom, &out.GradientTo, &out.GradientAngle, &out.GradientAnimated, &out.FontFamily, &out.FontWeight, &out.FontSize, &out.Layout, &out.Watermark, &out.CreatedAt, &out.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return out, ErrNotFound
	}
	return out, err
}

func (s *Store) CreateDesign(ctx context.Context, design models.Design) (models.Design, error) {
	var out models.Design
	err := s.db.QueryRow(ctx, `
		INSERT INTO designs (owner_id, name, background_type, background_value, card_color, button_color, text_color, logo_url, gradient_from, gradient_to, gradient_angle, gradient_animated, font_family, font_weight, font_size, layout, watermark)
		VALUES (NULLIF($1,'')::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
		RETURNING id::text, COALESCE(owner_id::text,''), name, background_type, background_value, card_color, button_color, text_color, logo_url, gradient_from, gradient_to, gradient_angle, gradient_animated, font_family, font_weight, font_size, layout, watermark, created_at, updated_at
	`, design.OwnerID, design.Name, defaultString(design.BackgroundType, "solid"), defaultString(design.BackgroundValue, "#edffef"), defaultString(design.CardColor, "#edffef"), defaultString(design.ButtonColor, "#0a844a"), defaultString(design.TextColor, "#030609"), strings.TrimSpace(design.LogoURL), defaultString(design.GradientFrom, "#edffef"), defaultString(design.GradientTo, "#0a844a"), positiveInt(design.GradientAngle, 135), design.GradientAnimated, defaultString(design.FontFamily, "system"), positiveInt(design.FontWeight, 700), positiveInt(design.FontSize, 100), defaultString(design.Layout, "custom"), design.Watermark).
		Scan(&out.ID, &out.OwnerID, &out.Name, &out.BackgroundType, &out.BackgroundValue, &out.CardColor, &out.ButtonColor, &out.TextColor, &out.LogoURL, &out.GradientFrom, &out.GradientTo, &out.GradientAngle, &out.GradientAnimated, &out.FontFamily, &out.FontWeight, &out.FontSize, &out.Layout, &out.Watermark, &out.CreatedAt, &out.UpdatedAt)
	return out, err
}

func (s *Store) UpdateDesign(ctx context.Context, id string, design models.Design) (models.Design, error) {
	var out models.Design
	err := s.db.QueryRow(ctx, `
		UPDATE designs
		SET name=$2, background_type=$3, background_value=$4, card_color=$5, button_color=$6, text_color=$7,
		    logo_url=$8, gradient_from=$9, gradient_to=$10, gradient_angle=$11, gradient_animated=$12,
		    font_family=$13, font_weight=$14, font_size=$15, layout=$16, watermark=$17, updated_at=now()
		WHERE id=$1
		RETURNING id::text, COALESCE(owner_id::text,''), name, background_type, background_value, card_color, button_color, text_color, logo_url, gradient_from, gradient_to, gradient_angle, gradient_animated, font_family, font_weight, font_size, layout, watermark, created_at, updated_at
	`, id, design.Name, defaultString(design.BackgroundType, "solid"), defaultString(design.BackgroundValue, "#edffef"), defaultString(design.CardColor, "#edffef"), defaultString(design.ButtonColor, "#0a844a"), defaultString(design.TextColor, "#030609"), strings.TrimSpace(design.LogoURL), defaultString(design.GradientFrom, "#edffef"), defaultString(design.GradientTo, "#0a844a"), positiveInt(design.GradientAngle, 135), design.GradientAnimated, defaultString(design.FontFamily, "system"), positiveInt(design.FontWeight, 700), positiveInt(design.FontSize, 100), defaultString(design.Layout, "custom"), design.Watermark).
		Scan(&out.ID, &out.OwnerID, &out.Name, &out.BackgroundType, &out.BackgroundValue, &out.CardColor, &out.ButtonColor, &out.TextColor, &out.LogoURL, &out.GradientFrom, &out.GradientTo, &out.GradientAngle, &out.GradientAnimated, &out.FontFamily, &out.FontWeight, &out.FontSize, &out.Layout, &out.Watermark, &out.CreatedAt, &out.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return out, ErrNotFound
	}
	return out, err
}

func (s *Store) DeleteDesign(ctx context.Context, id string) error {
	tag, err := s.db.Exec(ctx, `DELETE FROM designs WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func cardSelect() string {
	return `
		SELECT cards.id::text, cards.owner_id::text, cards.slug, cards.type, cards.status,
		       cards.name, cards.position, cards.company, cards.email, cards.website, cards.address, cards.address_geo_uri,
		       cards.phones, cards.socials, cards.photo_url, cards.logo_url, cards.hide_logo,
		       COALESCE(cards.design_id::text,''), cards.design_config, cards.vcf_button, cards.custom_fields,
		       cards.created_at, cards.updated_at, cards.published_at
		FROM cards`
}

func scanCards(rows pgx.Rows) ([]models.Card, error) {
	cards := []models.Card{}
	for rows.Next() {
		var card models.Card
		var phonesJSON, socialsJSON, designJSON, vcfButtonJSON, fieldsJSON []byte
		if err := rows.Scan(&card.ID, &card.OwnerID, &card.Slug, &card.Type, &card.Status, &card.Name, &card.Position, &card.Company, &card.Email, &card.Website, &card.Address, &card.AddressGeoURI, &phonesJSON, &socialsJSON, &card.PhotoURL, &card.LogoURL, &card.HideLogo, &card.DesignID, &designJSON, &vcfButtonJSON, &fieldsJSON, &card.CreatedAt, &card.UpdatedAt, &card.PublishedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(phonesJSON, &card.Phones)
		_ = json.Unmarshal(socialsJSON, &card.Socials)
		_ = json.Unmarshal(designJSON, &card.Design)
		_ = json.Unmarshal(vcfButtonJSON, &card.VCFButton)
		_ = json.Unmarshal(fieldsJSON, &card.CustomFields)
		if card.Phones == nil {
			card.Phones = []string{}
		}
		if card.CustomFields == nil {
			card.CustomFields = []models.CustomField{}
		}
		card.Design = normalizeDesignConfig(card.Design)
		card.VCFButton = normalizeVCFButton(card.VCFButton)
		cards = append(cards, card)
	}
	return cards, rows.Err()
}

func (s *Store) AttachProducts(ctx context.Context, card *models.Card) error {
	products, err := s.listProducts(ctx, card.ID)
	if err != nil {
		return err
	}
	card.Products = products
	return nil
}

func (s *Store) listProducts(ctx context.Context, cardID string) ([]models.Product, error) {
	rows, err := s.db.Query(ctx, `SELECT id::text, card_id::text, photo_url, title, price, sort_order, created_at, updated_at FROM products WHERE card_id=$1 ORDER BY sort_order, created_at`, cardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	products := []models.Product{}
	for rows.Next() {
		var product models.Product
		if err := rows.Scan(&product.ID, &product.CardID, &product.PhotoURL, &product.Title, &product.Price, &product.SortOrder, &product.CreatedAt, &product.UpdatedAt); err != nil {
			return nil, err
		}
		products = append(products, product)
	}
	return products, rows.Err()
}

func replaceProducts(ctx context.Context, tx pgx.Tx, cardID string, products []models.Product) error {
	if _, err := tx.Exec(ctx, `DELETE FROM products WHERE card_id=$1`, cardID); err != nil {
		return err
	}
	for index, product := range products {
		if strings.TrimSpace(product.Title) == "" {
			continue
		}
		if _, err := tx.Exec(ctx, `INSERT INTO products (card_id, photo_url, title, price, sort_order) VALUES ($1,$2,$3,$4,$5)`, cardID, product.PhotoURL, product.Title, product.Price, index); err != nil {
			return err
		}
	}
	return nil
}

func jsonValues(card models.Card) ([]byte, []byte, []byte, []byte, []byte) {
	phones, _ := json.Marshal(card.Phones)
	socials, _ := json.Marshal(card.Socials)
	design, _ := json.Marshal(normalizeDesignConfig(card.Design))
	vcfButton, _ := json.Marshal(normalizeVCFButton(card.VCFButton))
	fields, _ := json.Marshal(card.CustomFields)
	return phones, socials, design, vcfButton, fields
}

func scanDesigns(rows pgx.Rows) ([]models.Design, error) {
	designs := []models.Design{}
	for rows.Next() {
		var design models.Design
		if err := rows.Scan(&design.ID, &design.OwnerID, &design.Name, &design.BackgroundType, &design.BackgroundValue, &design.CardColor, &design.ButtonColor, &design.TextColor, &design.LogoURL, &design.GradientFrom, &design.GradientTo, &design.GradientAngle, &design.GradientAnimated, &design.FontFamily, &design.FontWeight, &design.FontSize, &design.Layout, &design.Watermark, &design.CreatedAt, &design.UpdatedAt); err != nil {
			return nil, err
		}
		designs = append(designs, design)
	}
	return designs, rows.Err()
}

func normalizeAppSettings(settings models.AppSettings) models.AppSettings {
	defaults := defaultAppSettings()
	settings.FaviconURL = defaultString(settings.FaviconURL, defaults.FaviconURL)
	settings.LandingLogoURL = defaultString(settings.LandingLogoURL, defaults.LandingLogoURL)
	settings.LandingEyebrow = defaultString(settings.LandingEyebrow, defaults.LandingEyebrow)
	settings.LandingTitle = defaultString(settings.LandingTitle, defaults.LandingTitle)
	settings.LandingLead = defaultString(settings.LandingLead, defaults.LandingLead)
	settings.LandingPrimaryLabel = defaultString(settings.LandingPrimaryLabel, defaults.LandingPrimaryLabel)
	settings.LandingPrimaryHref = defaultString(settings.LandingPrimaryHref, defaults.LandingPrimaryHref)
	settings.LandingSecondaryLabel = defaultString(settings.LandingSecondaryLabel, defaults.LandingSecondaryLabel)
	settings.LandingSecondaryHref = defaultString(settings.LandingSecondaryHref, defaults.LandingSecondaryHref)
	settings.LandingFeatures = cleanSettingStrings(settings.LandingFeatures, 6)
	if len(settings.LandingFeatures) == 0 {
		settings.LandingFeatures = defaults.LandingFeatures
	}

	card := defaults.LandingCard
	if strings.TrimSpace(settings.LandingCard.Name) != "" {
		card = settings.LandingCard
	}
	card.Slug = defaultString(card.Slug, defaults.LandingCard.Slug)
	card.Type = defaultString(card.Type, models.CardTypePerson)
	card.Status = models.StatusPublished
	card.Name = defaultString(card.Name, defaults.LandingCard.Name)
	card.Position = strings.TrimSpace(card.Position)
	card.Company = strings.TrimSpace(card.Company)
	card.Email = strings.ToLower(strings.TrimSpace(card.Email))
	card.Website = strings.TrimSpace(card.Website)
	card.Address = strings.TrimSpace(card.Address)
	card.AddressGeoURI = geo.NormalizeURI(card.AddressGeoURI)
	if card.AddressGeoURI == "" {
		card.AddressGeoURI = geo.NormalizeURI(card.Address)
	}
	card.Phones = cleanSettingStrings(card.Phones, 8)
	if len(card.Phones) == 0 {
		card.Phones = defaults.LandingCard.Phones
	}
	card.Design = normalizeDesignConfig(card.Design)
	card.Design.LogoURL = settings.LandingLogoURL
	card.VCFButton = normalizeVCFButton(card.VCFButton)
	if card.CustomFields == nil {
		card.CustomFields = []models.CustomField{}
	}
	if card.Products == nil {
		card.Products = []models.Product{}
	}
	settings.LandingCard = card
	return settings
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func cleanSettingStrings(values []string, limit int) []string {
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

func positiveInt(value, fallback int) int {
	if value > 0 {
		return value
	}
	return fallback
}

func normalizeDesignConfig(design models.DesignConfig) models.DesignConfig {
	design.BackgroundType = defaultString(design.BackgroundType, "solid")
	design.BackgroundValue = defaultString(design.BackgroundValue, "#edffef")
	design.CardColor = defaultString(design.CardColor, "#edffef")
	design.ButtonColor = defaultString(design.ButtonColor, "#0a844a")
	design.TextColor = defaultString(design.TextColor, "#030609")
	design.LogoURL = strings.TrimSpace(design.LogoURL)
	design.GradientFrom = defaultString(design.GradientFrom, design.BackgroundValue)
	design.GradientTo = defaultString(design.GradientTo, design.ButtonColor)
	design.GradientAngle = positiveInt(design.GradientAngle, 135)
	design.FontFamily = defaultString(design.FontFamily, "system")
	design.FontWeight = positiveInt(design.FontWeight, 700)
	design.FontSize = positiveInt(design.FontSize, 100)
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
