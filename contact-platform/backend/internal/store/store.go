package store

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"nexora/contact-platform/backend/internal/geo"
	"nexora/contact-platform/backend/internal/models"
)

var ErrNotFound = errors.New("not found")

const designSelectColumns = `id::text, COALESCE(owner_id::text,''), name, background_type, background_value, background_mesh, card_background_type, card_background_value, card_color, card_gradient_from, card_gradient_to, card_gradient_angle, card_gradient_animated, card_gradient_animation_speed, card_mesh, button_color, text_color, logo_url, logo_min_width, top_image_url, bottom_image_url, gradient_from, gradient_to, gradient_angle, gradient_animated, gradient_animation_speed, font_family, font_weight, font_size, layout, watermark, created_at, updated_at`

type Store struct {
	db *pgxpool.Pool
}

func New(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

func defaultAppSettings() models.AppSettings {
	logo := "/nexora-text-logo.svg"
	return models.AppSettings{
		FaviconURL:              logo,
		Translations:            defaultTranslations(),
		LandingLogoURL:          logo,
		LandingLogoMinWidth:     154,
		LandingCardLogoMinWidth: 250,
		LandingEyebrow:          "Nexora Contacts",
		LandingTitle:            "Контактные карточки и мини-витрины без лишней возни.",
		LandingLead:             "Публичные ссылки, VCF, несколько телефонов, товары, кастомный дизайн и предпросмотр в одном аккуратном рабочем интерфейсе.",
		LandingPrimaryLabel:     "Войти",
		LandingPrimaryHref:      "/login",
		LandingSecondaryLabel:   "Регистрация",
		LandingSecondaryHref:    "/register",
		LandingFeatures:         []string{"Person cards", "Store catalog", "VCF export"},
		LandingCard: models.Card{
			Slug:                 "demo",
			Type:                 models.CardTypePerson,
			Status:               models.StatusPublished,
			PreferredLanguage:    models.LanguageRU,
			Name:                 "Айбек Осмонов",
			NameTranslations:     models.LocalizedText{},
			Position:             "AI Operations Consultant",
			PositionTranslations: models.LocalizedText{},
			Company:              "Nexora Group",
			Email:                "demo@nexora.kg",
			Website:              "https://nexora.kg",
			Address:              "Бишкек",
			AddressGeoURI:        "geo:42.8746,74.5698",
			Phones:               []string{"+996 555 123 456"},
			Socials:              models.Socials{Telegram: "https://t.me/nexora"},
			Design: models.DesignConfig{
				BackgroundType:             "solid",
				BackgroundValue:            "#edffef",
				BackgroundMesh:             defaultMeshGradient("#edffef", "#0a844a"),
				CardBackgroundType:         "solid",
				CardBackgroundValue:        "#edffef",
				CardColor:                  "#edffef",
				CardGradientFrom:           "#edffef",
				CardGradientTo:             "#0a844a",
				CardGradientAngle:          135,
				CardGradientAnimationSpeed: 10,
				CardMesh:                   defaultMeshGradient("#edffef", "#0a844a"),
				ButtonColor:                "#0a844a",
				TextColor:                  "#030609",
				LogoURL:                    logo,
				LogoMinWidth:               250,
				GradientFrom:               "#edffef",
				GradientTo:                 "#0a844a",
				GradientAngle:              135,
				GradientAnimated:           false,
				GradientAnimationSpeed:     10,
				FontFamily:                 "system",
				FontWeight:                 700,
				FontSize:                   100,
				Layout:                     "nexora_default",
				Watermark:                  true,
			},
			VCFButton:    models.VCFButton{Enabled: true, Label: "Сохранить контакт"},
			CustomFields: []models.CustomField{{Label: "Office", Value: "Mon-Fri, 10:00-18:00", Type: "text"}},
			Products:     []models.Product{},
		},
	}
}

func defaultTranslations() models.TranslationDictionary {
	return models.TranslationDictionary{
		models.LanguageRU: {
			"language_menu_label":       "Выбрать язык",
			"language_ru":               "Русский",
			"language_en":               "English",
			"language_ky":               "Кыргызча",
			"phone_label":               "Телефон",
			"email_label":               "Email",
			"website_label":             "Сайт",
			"address_label":             "Адрес",
			"open_map_label":            "Открыть в карте",
			"vcf_save_label":            "Сохранить контакт",
			"person_name_placeholder":   "Имя Фамилия",
			"store_name_placeholder":    "Название магазина",
			"product_placeholder":       "Товар",
			"nexora_footer_description": "AI-образование, автоматизация, цифровые контактные карты и генерация документов.",
		},
		models.LanguageEN: {
			"language_menu_label":       "Choose language",
			"language_ru":               "Russian",
			"language_en":               "English",
			"language_ky":               "Kyrgyz",
			"phone_label":               "Phone",
			"email_label":               "Email",
			"website_label":             "Website",
			"address_label":             "Address",
			"open_map_label":            "Open in map",
			"vcf_save_label":            "Save contact",
			"person_name_placeholder":   "Full name",
			"store_name_placeholder":    "Store name",
			"product_placeholder":       "Product",
			"nexora_footer_description": "AI education, automation, digital contact cards, and document generation.",
		},
		models.LanguageKY: {
			"language_menu_label":       "Тилди тандоо",
			"language_ru":               "Орусча",
			"language_en":               "Англисче",
			"language_ky":               "Кыргызча",
			"phone_label":               "Телефон",
			"email_label":               "Email",
			"website_label":             "Сайт",
			"address_label":             "Дарек",
			"open_map_label":            "Картадан ачуу",
			"vcf_save_label":            "Байланышты сактоо",
			"person_name_placeholder":   "Аты-жөнү",
			"store_name_placeholder":    "Дүкөндүн аталышы",
			"product_placeholder":       "Товар",
			"nexora_footer_description": "AI боюнча билим берүү, автоматташтыруу, санарип байланыш карталары жана документтерди түзүү.",
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
			Name:                "Nexora green default",
			BackgroundType:      "solid",
			BackgroundValue:     "#edffef",
			CardBackgroundType:  "solid",
			CardBackgroundValue: "#edffef",
			CardColor:           "#edffef",
			CardGradientFrom:    "#edffef",
			CardGradientTo:      "#0a844a",
			CardGradientAngle:   135,
			ButtonColor:         "#0a844a",
			TextColor:           "#030609",
			Layout:              "nexora_default",
			Watermark:           true,
		},
		{
			Name:                "White",
			BackgroundType:      "solid",
			BackgroundValue:     "#f4f4f5",
			CardBackgroundType:  "solid",
			CardBackgroundValue: "#ffffff",
			CardColor:           "#ffffff",
			CardGradientFrom:    "#ffffff",
			CardGradientTo:      "#111111",
			CardGradientAngle:   135,
			ButtonColor:         "#111111",
			TextColor:           "#111111",
			Layout:              "white",
			Watermark:           false,
		},
		{
			Name:                "Dark",
			BackgroundType:      "solid",
			BackgroundValue:     "#080808",
			CardBackgroundType:  "solid",
			CardBackgroundValue: "#000000",
			CardColor:           "#000000",
			CardGradientFrom:    "#000000",
			CardGradientTo:      "#4b5563",
			CardGradientAngle:   135,
			ButtonColor:         "#ffffff",
			TextColor:           "#f4f4f5",
			Layout:              "dark",
			Watermark:           false,
		},
	}
	for _, preset := range presets {
		_, err := s.db.Exec(ctx, `
			INSERT INTO designs (name, background_type, background_value, card_background_type, card_background_value, card_color, card_gradient_from, card_gradient_to, card_gradient_angle, button_color, text_color, layout, watermark)
			SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
			WHERE NOT EXISTS (
				SELECT 1 FROM designs WHERE owner_id IS NULL AND layout=$12
			)
		`, preset.Name, preset.BackgroundType, preset.BackgroundValue, preset.CardBackgroundType, preset.CardBackgroundValue, preset.CardColor, preset.CardGradientFrom, preset.CardGradientTo, preset.CardGradientAngle, preset.ButtonColor, preset.TextColor, preset.Layout, preset.Watermark)
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
	if value := strings.TrimSpace(values["translations"]); value != "" {
		_ = json.Unmarshal([]byte(value), &settings.Translations)
	}
	if value, ok := values["landing_logo_url"]; ok {
		settings.LandingLogoURL = value
	} else if settings.DefaultLogoURL != "" {
		settings.LandingLogoURL = settings.DefaultLogoURL
	}
	if value, ok := values["landing_logo_min_width"]; ok {
		settings.LandingLogoMinWidth = parseInt(value, settings.LandingLogoMinWidth)
	}
	if value, ok := values["landing_card_logo_min_width"]; ok {
		settings.LandingCardLogoMinWidth = parseInt(value, settings.LandingCardLogoMinWidth)
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
	translations, _ := json.Marshal(settings.Translations)
	values := map[string]string{
		"favicon_url":                 settings.FaviconURL,
		"translations":                string(translations),
		"landing_logo_url":            settings.LandingLogoURL,
		"landing_logo_min_width":      strconv.Itoa(settings.LandingLogoMinWidth),
		"landing_card_logo_min_width": strconv.Itoa(settings.LandingCardLogoMinWidth),
		"landing_eyebrow":             settings.LandingEyebrow,
		"landing_title":               settings.LandingTitle,
		"landing_lead":                settings.LandingLead,
		"landing_primary_label":       settings.LandingPrimaryLabel,
		"landing_primary_href":        settings.LandingPrimaryHref,
		"landing_secondary_label":     settings.LandingSecondaryLabel,
		"landing_secondary_href":      settings.LandingSecondaryHref,
		"landing_features":            string(features),
		"landing_card":                string(landingCard),
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
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return models.Card{}, err
	}
	defer tx.Rollback(ctx)
	cardDesign, err := resolveCardDesign(ctx, tx, card)
	if err != nil {
		return models.Card{}, err
	}
	phones, socials, nameTranslations, positionTranslations, design, vcfButton, fields := jsonValues(card, cardDesign)

	err = tx.QueryRow(ctx, `
		INSERT INTO cards (
			owner_id, slug, type, status, preferred_language, name, name_translations, position, position_translations, company, email, website, address, address_geo_uri,
			phones, socials, photo_url, logo_url, hide_logo, design_id, design_config, vcf_button, custom_fields
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NULLIF($20,'')::uuid,$21,$22,$23)
		RETURNING id::text, created_at, updated_at, published_at
	`, card.OwnerID, card.Slug, card.Type, defaultString(card.Status, models.StatusDraft), normalizeLanguage(card.PreferredLanguage), card.Name, nameTranslations, card.Position, positionTranslations, card.Company, card.Email, card.Website, card.Address, card.AddressGeoURI, phones, socials, card.PhotoURL, card.LogoURL, card.HideLogo, card.DesignID, design, vcfButton, fields).Scan(&card.ID, &card.CreatedAt, &card.UpdatedAt, &card.PublishedAt)
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
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return models.Card{}, err
	}
	defer tx.Rollback(ctx)
	cardDesign, err := resolveCardDesign(ctx, tx, card)
	if err != nil {
		return models.Card{}, err
	}
	phones, socials, nameTranslations, positionTranslations, design, vcfButton, fields := jsonValues(card, cardDesign)

	tag, err := tx.Exec(ctx, `
		UPDATE cards
		SET slug=$2, type=$3, status=$4, preferred_language=$5, name=$6, name_translations=$7, position=$8,
		    position_translations=$9, company=$10, email=$11, website=$12, address=$13, address_geo_uri=$14,
		    phones=$15, socials=$16, photo_url=$17, logo_url=$18, hide_logo=$19,
		    design_id=NULLIF($20,'')::uuid, design_config=$21, vcf_button=$22, custom_fields=$23, updated_at=now()
		WHERE id=$1
	`, id, card.Slug, card.Type, defaultString(card.Status, models.StatusDraft), normalizeLanguage(card.PreferredLanguage), card.Name, nameTranslations, card.Position, positionTranslations, card.Company, card.Email, card.Website, card.Address, card.AddressGeoURI, phones, socials, card.PhotoURL, card.LogoURL, card.HideLogo, card.DesignID, design, vcfButton, fields)
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
	rows, err := s.db.Query(ctx, `SELECT `+designSelectColumns+` FROM designs ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanDesigns(rows)
}

func (s *Store) GetDesign(ctx context.Context, id string) (models.Design, error) {
	out, err := scanDesign(s.db.QueryRow(ctx, `SELECT `+designSelectColumns+` FROM designs WHERE id=$1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return out, ErrNotFound
	}
	return out, err
}

func (s *Store) CreateDesign(ctx context.Context, design models.Design) (models.Design, error) {
	design = normalizeDesignRecord(design)
	backgroundMesh, _ := json.Marshal(design.BackgroundMesh)
	cardMesh, _ := json.Marshal(design.CardMesh)
	out, err := scanDesign(s.db.QueryRow(ctx, `
		INSERT INTO designs (owner_id, name, background_type, background_value, background_mesh, card_background_type, card_background_value, card_color, card_gradient_from, card_gradient_to, card_gradient_angle, card_gradient_animated, card_gradient_animation_speed, card_mesh, button_color, text_color, logo_url, logo_min_width, top_image_url, bottom_image_url, gradient_from, gradient_to, gradient_angle, gradient_animated, gradient_animation_speed, font_family, font_weight, font_size, layout, watermark)
		VALUES (NULLIF($1,'')::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
		RETURNING `+designSelectColumns+`
	`, design.OwnerID, design.Name, design.BackgroundType, design.BackgroundValue, backgroundMesh, design.CardBackgroundType, design.CardBackgroundValue, design.CardColor, design.CardGradientFrom, design.CardGradientTo, design.CardGradientAngle, design.CardGradientAnimated, design.CardGradientAnimationSpeed, cardMesh, design.ButtonColor, design.TextColor, design.LogoURL, design.LogoMinWidth, design.TopImageURL, design.BottomImageURL, design.GradientFrom, design.GradientTo, design.GradientAngle, design.GradientAnimated, design.GradientAnimationSpeed, design.FontFamily, design.FontWeight, design.FontSize, design.Layout, design.Watermark))
	return out, err
}

func (s *Store) UpdateDesign(ctx context.Context, id string, design models.Design) (models.Design, error) {
	design = normalizeDesignRecord(design)
	backgroundMesh, _ := json.Marshal(design.BackgroundMesh)
	cardMesh, _ := json.Marshal(design.CardMesh)
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return models.Design{}, err
	}
	defer tx.Rollback(ctx)
	out, err := scanDesign(tx.QueryRow(ctx, `
		UPDATE designs
		SET name=$2, background_type=$3, background_value=$4, background_mesh=$5,
		    card_background_type=$6, card_background_value=$7, card_color=$8,
		    card_gradient_from=$9, card_gradient_to=$10, card_gradient_angle=$11, card_gradient_animated=$12, card_gradient_animation_speed=$13, card_mesh=$14,
		    button_color=$15, text_color=$16, logo_url=$17, logo_min_width=$18, top_image_url=$19, bottom_image_url=$20,
		    gradient_from=$21, gradient_to=$22, gradient_angle=$23, gradient_animated=$24, gradient_animation_speed=$25,
		    font_family=$26, font_weight=$27, font_size=$28, layout=$29, watermark=$30, updated_at=now()
		WHERE id=$1
		RETURNING `+designSelectColumns+`
	`, id, design.Name, design.BackgroundType, design.BackgroundValue, backgroundMesh, design.CardBackgroundType, design.CardBackgroundValue, design.CardColor, design.CardGradientFrom, design.CardGradientTo, design.CardGradientAngle, design.CardGradientAnimated, design.CardGradientAnimationSpeed, cardMesh, design.ButtonColor, design.TextColor, design.LogoURL, design.LogoMinWidth, design.TopImageURL, design.BottomImageURL, design.GradientFrom, design.GradientTo, design.GradientAngle, design.GradientAnimated, design.GradientAnimationSpeed, design.FontFamily, design.FontWeight, design.FontSize, design.Layout, design.Watermark))
	if errors.Is(err, pgx.ErrNoRows) {
		return out, ErrNotFound
	}
	if err != nil {
		return out, err
	}
	designJSON, _ := json.Marshal(designConfigFromRecord(out))
	if _, err := tx.Exec(ctx, `
		UPDATE cards
		SET design_config=$2, updated_at=now()
		WHERE design_id=$1
	`, id, designJSON); err != nil {
		return out, err
	}
	if out.Layout == "nexora_default" {
		if _, err := tx.Exec(ctx, `
			UPDATE app_settings
			SET value=jsonb_set(value::jsonb, '{design}', $1::jsonb, true)::text,
			    updated_at=now()
			WHERE key='landing_card' AND value <> ''
		`, string(designJSON)); err != nil {
			return out, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return out, err
	}
	return out, nil
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
		       cards.preferred_language, cards.name, cards.name_translations, cards.position, cards.position_translations,
		       cards.company, cards.email, cards.website, cards.address, cards.address_geo_uri,
		       cards.phones, cards.socials, cards.photo_url, cards.logo_url, cards.hide_logo,
		       COALESCE(cards.design_id::text,''),
		       COALESCE(to_jsonb(designs) - ARRAY['id','owner_id','name','created_at','updated_at'], cards.design_config),
		       cards.vcf_button, cards.custom_fields,
		       cards.created_at, cards.updated_at, cards.published_at
		FROM cards
		LEFT JOIN designs ON designs.id=cards.design_id`
}

func scanCards(rows pgx.Rows) ([]models.Card, error) {
	cards := []models.Card{}
	for rows.Next() {
		var card models.Card
		var phonesJSON, socialsJSON, nameTranslationsJSON, positionTranslationsJSON, designJSON, vcfButtonJSON, fieldsJSON []byte
		if err := rows.Scan(&card.ID, &card.OwnerID, &card.Slug, &card.Type, &card.Status, &card.PreferredLanguage, &card.Name, &nameTranslationsJSON, &card.Position, &positionTranslationsJSON, &card.Company, &card.Email, &card.Website, &card.Address, &card.AddressGeoURI, &phonesJSON, &socialsJSON, &card.PhotoURL, &card.LogoURL, &card.HideLogo, &card.DesignID, &designJSON, &vcfButtonJSON, &fieldsJSON, &card.CreatedAt, &card.UpdatedAt, &card.PublishedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(phonesJSON, &card.Phones)
		_ = json.Unmarshal(socialsJSON, &card.Socials)
		_ = json.Unmarshal(nameTranslationsJSON, &card.NameTranslations)
		_ = json.Unmarshal(positionTranslationsJSON, &card.PositionTranslations)
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
		card.PreferredLanguage = normalizeLanguage(card.PreferredLanguage)
		card.Socials = normalizeSocials(card.Socials)
		card.NameTranslations = normalizeLocalizedText(card.NameTranslations)
		card.PositionTranslations = normalizeLocalizedText(card.PositionTranslations)
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

func jsonValues(card models.Card, cardDesign models.DesignConfig) ([]byte, []byte, []byte, []byte, []byte, []byte, []byte) {
	phones, _ := json.Marshal(card.Phones)
	socials, _ := json.Marshal(normalizeSocials(card.Socials))
	nameTranslations, _ := json.Marshal(normalizeLocalizedText(card.NameTranslations))
	positionTranslations, _ := json.Marshal(normalizeLocalizedText(card.PositionTranslations))
	design, _ := json.Marshal(cardDesign)
	vcfButton, _ := json.Marshal(normalizeVCFButton(card.VCFButton))
	fields, _ := json.Marshal(card.CustomFields)
	return phones, socials, nameTranslations, positionTranslations, design, vcfButton, fields
}

func resolveCardDesign(ctx context.Context, tx pgx.Tx, card models.Card) (models.DesignConfig, error) {
	if strings.TrimSpace(card.DesignID) == "" {
		return normalizeDesignConfig(card.Design), nil
	}
	design, err := scanDesign(tx.QueryRow(ctx, `SELECT `+designSelectColumns+` FROM designs WHERE id=$1`, card.DesignID))
	if errors.Is(err, pgx.ErrNoRows) {
		return models.DesignConfig{}, ErrNotFound
	}
	if err != nil {
		return models.DesignConfig{}, err
	}
	return designConfigFromRecord(design), nil
}

type designScanner interface {
	Scan(dest ...any) error
}

func scanDesign(scanner designScanner) (models.Design, error) {
	var design models.Design
	var backgroundMeshJSON, cardMeshJSON []byte
	err := scanner.Scan(
		&design.ID,
		&design.OwnerID,
		&design.Name,
		&design.BackgroundType,
		&design.BackgroundValue,
		&backgroundMeshJSON,
		&design.CardBackgroundType,
		&design.CardBackgroundValue,
		&design.CardColor,
		&design.CardGradientFrom,
		&design.CardGradientTo,
		&design.CardGradientAngle,
		&design.CardGradientAnimated,
		&design.CardGradientAnimationSpeed,
		&cardMeshJSON,
		&design.ButtonColor,
		&design.TextColor,
		&design.LogoURL,
		&design.LogoMinWidth,
		&design.TopImageURL,
		&design.BottomImageURL,
		&design.GradientFrom,
		&design.GradientTo,
		&design.GradientAngle,
		&design.GradientAnimated,
		&design.GradientAnimationSpeed,
		&design.FontFamily,
		&design.FontWeight,
		&design.FontSize,
		&design.Layout,
		&design.Watermark,
		&design.CreatedAt,
		&design.UpdatedAt,
	)
	if err != nil {
		return design, err
	}
	_ = json.Unmarshal(backgroundMeshJSON, &design.BackgroundMesh)
	_ = json.Unmarshal(cardMeshJSON, &design.CardMesh)
	return normalizeDesignRecord(design), nil
}

func scanDesigns(rows pgx.Rows) ([]models.Design, error) {
	designs := []models.Design{}
	for rows.Next() {
		design, err := scanDesign(rows)
		if err != nil {
			return nil, err
		}
		designs = append(designs, design)
	}
	return designs, rows.Err()
}

func normalizeAppSettings(settings models.AppSettings) models.AppSettings {
	defaults := defaultAppSettings()
	settings.FaviconURL = defaultString(settings.FaviconURL, defaults.FaviconURL)
	settings.Translations = normalizeTranslations(settings.Translations)
	settings.LandingLogoURL = defaultString(settings.LandingLogoURL, defaults.LandingLogoURL)
	settings.LandingLogoMinWidth = boundedInt(settings.LandingLogoMinWidth, defaults.LandingLogoMinWidth, 80, 420)
	settings.LandingCardLogoMinWidth = boundedInt(settings.LandingCardLogoMinWidth, defaults.LandingCardLogoMinWidth, 120, 420)
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
	card.PreferredLanguage = normalizeLanguage(card.PreferredLanguage)
	card.Name = defaultString(card.Name, defaults.LandingCard.Name)
	card.NameTranslations = normalizeLocalizedText(card.NameTranslations)
	card.Position = strings.TrimSpace(card.Position)
	card.PositionTranslations = normalizeLocalizedText(card.PositionTranslations)
	card.Company = strings.TrimSpace(card.Company)
	card.Email = strings.ToLower(strings.TrimSpace(card.Email))
	card.Website = strings.TrimSpace(card.Website)
	card.Socials = normalizeSocials(card.Socials)
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
	card.Design.LogoMinWidth = settings.LandingCardLogoMinWidth
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
		LinkedIn:  strings.TrimSpace(socials.LinkedIn),
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

func normalizeTranslations(values models.TranslationDictionary) models.TranslationDictionary {
	defaults := defaultTranslations()
	out := defaultTranslations()
	for language, copy := range defaults {
		source, ok := values[language]
		if !ok {
			continue
		}
		for key := range copy {
			if value := strings.TrimSpace(source[key]); value != "" {
				out[language][key] = value
			}
		}
	}
	return out
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

func parseInt(value string, fallback int) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return fallback
	}
	return parsed
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

func positiveInt(value, fallback int) int {
	if value > 0 {
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

func normalizeBackgroundType(value string) string {
	switch strings.TrimSpace(value) {
	case "solid", "gradient", "mesh":
		return strings.TrimSpace(value)
	default:
		return "solid"
	}
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
			point.ID = "p" + strconv.Itoa(index+1)
		}
		point.X = clampedFloat(point.X, 0, 100)
		point.Y = clampedFloat(point.Y, 0, 100)
		point.Color = normalizeColor(point.Color, primary)
		point.Opacity = clampedFloat(point.Opacity, 0, 1)
		point.Radius = clampedFloat(point.Radius, 18, 90)
	}
	return mesh
}

func normalizeDesignConfig(design models.DesignConfig) models.DesignConfig {
	design.BackgroundType = normalizeBackgroundType(design.BackgroundType)
	design.BackgroundValue = defaultString(design.BackgroundValue, "#edffef")
	design.ButtonColor = defaultString(design.ButtonColor, "#0a844a")
	design.CardBackgroundType = normalizeBackgroundType(design.CardBackgroundType)
	design.CardBackgroundValue = defaultString(design.CardBackgroundValue, defaultString(design.CardColor, "#edffef"))
	design.CardColor = defaultString(design.CardColor, "#edffef")
	design.CardGradientFrom = defaultString(design.CardGradientFrom, design.CardBackgroundValue)
	design.CardGradientTo = defaultString(design.CardGradientTo, design.ButtonColor)
	design.CardGradientAngle = positiveInt(design.CardGradientAngle, 135)
	design.CardGradientAnimationSpeed = boundedInt(design.CardGradientAnimationSpeed, 10, 3, 40)
	design.BackgroundMesh = normalizeMeshGradient(design.BackgroundMesh, design.BackgroundValue, design.ButtonColor)
	design.CardMesh = normalizeMeshGradient(design.CardMesh, design.CardBackgroundValue, design.ButtonColor)
	design.TextColor = defaultString(design.TextColor, "#030609")
	design.LogoURL = strings.TrimSpace(design.LogoURL)
	design.LogoMinWidth = boundedInt(design.LogoMinWidth, 250, 120, 420)
	design.TopImageURL = strings.TrimSpace(design.TopImageURL)
	design.BottomImageURL = strings.TrimSpace(design.BottomImageURL)
	design.GradientFrom = defaultString(design.GradientFrom, design.BackgroundValue)
	design.GradientTo = defaultString(design.GradientTo, design.ButtonColor)
	design.GradientAngle = positiveInt(design.GradientAngle, 135)
	design.GradientAnimationSpeed = boundedInt(design.GradientAnimationSpeed, 10, 3, 40)
	design.FontFamily = defaultString(design.FontFamily, "system")
	design.FontWeight = positiveInt(design.FontWeight, 700)
	design.FontSize = positiveInt(design.FontSize, 100)
	design.Layout = defaultString(design.Layout, "custom")
	return design
}

func normalizeDesignRecord(design models.Design) models.Design {
	config := designConfigFromRecord(design)
	design.Name = strings.TrimSpace(design.Name)
	design.BackgroundType = config.BackgroundType
	design.BackgroundValue = config.BackgroundValue
	design.BackgroundMesh = config.BackgroundMesh
	design.CardBackgroundType = config.CardBackgroundType
	design.CardBackgroundValue = config.CardBackgroundValue
	design.CardColor = config.CardColor
	design.CardGradientFrom = config.CardGradientFrom
	design.CardGradientTo = config.CardGradientTo
	design.CardGradientAngle = config.CardGradientAngle
	design.CardGradientAnimated = config.CardGradientAnimated
	design.CardGradientAnimationSpeed = config.CardGradientAnimationSpeed
	design.CardMesh = config.CardMesh
	design.ButtonColor = config.ButtonColor
	design.TextColor = config.TextColor
	design.LogoURL = config.LogoURL
	design.LogoMinWidth = config.LogoMinWidth
	design.TopImageURL = config.TopImageURL
	design.BottomImageURL = config.BottomImageURL
	design.GradientFrom = config.GradientFrom
	design.GradientTo = config.GradientTo
	design.GradientAngle = config.GradientAngle
	design.GradientAnimated = config.GradientAnimated
	design.GradientAnimationSpeed = config.GradientAnimationSpeed
	design.FontFamily = config.FontFamily
	design.FontWeight = config.FontWeight
	design.FontSize = config.FontSize
	design.Layout = config.Layout
	design.Watermark = config.Watermark
	return design
}

func designConfigFromRecord(design models.Design) models.DesignConfig {
	return normalizeDesignConfig(models.DesignConfig{
		BackgroundType:             design.BackgroundType,
		BackgroundValue:            design.BackgroundValue,
		BackgroundMesh:             design.BackgroundMesh,
		CardBackgroundType:         design.CardBackgroundType,
		CardBackgroundValue:        design.CardBackgroundValue,
		CardColor:                  design.CardColor,
		CardGradientFrom:           design.CardGradientFrom,
		CardGradientTo:             design.CardGradientTo,
		CardGradientAngle:          design.CardGradientAngle,
		CardGradientAnimated:       design.CardGradientAnimated,
		CardGradientAnimationSpeed: design.CardGradientAnimationSpeed,
		CardMesh:                   design.CardMesh,
		ButtonColor:                design.ButtonColor,
		TextColor:                  design.TextColor,
		LogoURL:                    design.LogoURL,
		LogoMinWidth:               design.LogoMinWidth,
		TopImageURL:                design.TopImageURL,
		BottomImageURL:             design.BottomImageURL,
		GradientFrom:               design.GradientFrom,
		GradientTo:                 design.GradientTo,
		GradientAngle:              design.GradientAngle,
		GradientAnimated:           design.GradientAnimated,
		GradientAnimationSpeed:     design.GradientAnimationSpeed,
		FontFamily:                 design.FontFamily,
		FontWeight:                 design.FontWeight,
		FontSize:                   design.FontSize,
		Layout:                     design.Layout,
		Watermark:                  design.Watermark,
	})
}

func normalizeVCFButton(button models.VCFButton) models.VCFButton {
	if strings.TrimSpace(button.Label) == "" {
		button.Label = "Скачать VCF"
		button.Enabled = true
	}
	button.Label = strings.TrimSpace(button.Label)
	return button
}
