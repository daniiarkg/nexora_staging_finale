package models

import "time"

const (
	RoleSuperUser = "super_user"
	RoleUser      = "user"

	CardTypePerson = "person"
	CardTypeStore  = "store"

	StatusDraft     = "draft"
	StatusPublished = "published"
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Socials struct {
	Instagram string `json:"instagram,omitempty"`
	LinkedIn  string `json:"linkedin,omitempty"`
	Whatsapp  string `json:"whatsapp,omitempty"`
	Telegram  string `json:"telegram,omitempty"`
}

type CustomField struct {
	Label     string `json:"label"`
	Value     string `json:"value"`
	Type      string `json:"type"`
	SortOrder int    `json:"sort_order"`
}

type DesignConfig struct {
	BackgroundType   string `json:"background_type"`
	BackgroundValue  string `json:"background_value"`
	CardColor        string `json:"card_color"`
	ButtonColor      string `json:"button_color"`
	TextColor        string `json:"text_color"`
	GradientFrom     string `json:"gradient_from"`
	GradientTo       string `json:"gradient_to"`
	GradientAngle    int    `json:"gradient_angle"`
	GradientAnimated bool   `json:"gradient_animated"`
	FontFamily       string `json:"font_family"`
	FontWeight       int    `json:"font_weight"`
	FontSize         int    `json:"font_size"`
	Layout           string `json:"layout"`
	Watermark        bool   `json:"watermark"`
}

type VCFButton struct {
	Enabled bool   `json:"enabled"`
	Label   string `json:"label"`
}

type Card struct {
	ID           string        `json:"id"`
	OwnerID      string        `json:"owner_id"`
	Slug         string        `json:"slug"`
	Type         string        `json:"type"`
	Status       string        `json:"status"`
	Name         string        `json:"name"`
	Position     string        `json:"position,omitempty"`
	Company      string        `json:"company,omitempty"`
	Email        string        `json:"email,omitempty"`
	Website      string        `json:"website,omitempty"`
	Address      string        `json:"address,omitempty"`
	Phones       []string      `json:"phones"`
	Socials      Socials       `json:"socials"`
	PhotoURL     string        `json:"photo_url,omitempty"`
	LogoURL      string        `json:"logo_url,omitempty"`
	HideLogo     bool          `json:"hide_logo"`
	DesignID     string        `json:"design_id,omitempty"`
	Design       DesignConfig  `json:"design"`
	VCFButton    VCFButton     `json:"vcf_button"`
	CustomFields []CustomField `json:"custom_fields"`
	Products     []Product     `json:"products,omitempty"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
	PublishedAt  *time.Time    `json:"published_at,omitempty"`
}

type Product struct {
	ID        string    `json:"id"`
	CardID    string    `json:"card_id"`
	PhotoURL  string    `json:"photo_url,omitempty"`
	Title     string    `json:"title"`
	Price     string    `json:"price"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Design struct {
	ID               string    `json:"id"`
	OwnerID          string    `json:"owner_id,omitempty"`
	Name             string    `json:"name"`
	BackgroundType   string    `json:"background_type"`
	BackgroundValue  string    `json:"background_value"`
	CardColor        string    `json:"card_color"`
	ButtonColor      string    `json:"button_color"`
	TextColor        string    `json:"text_color"`
	GradientFrom     string    `json:"gradient_from"`
	GradientTo       string    `json:"gradient_to"`
	GradientAngle    int       `json:"gradient_angle"`
	GradientAnimated bool      `json:"gradient_animated"`
	FontFamily       string    `json:"font_family"`
	FontWeight       int       `json:"font_weight"`
	FontSize         int       `json:"font_size"`
	Layout           string    `json:"layout"`
	Watermark        bool      `json:"watermark"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type AppSettings struct {
	DefaultLogoURL string `json:"default_logo_url"`
}
