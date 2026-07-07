package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	minSessionSecretLength = 32
	minRootPasswordLength  = 12
)

var placeholderSecrets = map[string]struct{}{
	"change-me-in-production":                               {},
	"change-me-root-password":                               {},
	"replace-with-64-random-chars":                          {},
	"replace-with-strong-random-db-password":                {},
	"replace-with-strong-root-password":                     {},
	"replace-or-use-/etc/nexora-contact.env-admin_password": {},
	"changeme": {},
	"password": {},
	"secret":   {},
}

type Config struct {
	Addr           string
	DatabaseURL    string
	PublicBaseURL  string
	CORSOrigins    []string
	StorageDir     string
	MigrationsDir  string
	SessionSecret  string
	SessionTTL     time.Duration
	RootPassword   string
	ValkeyURL      string
	AuthRateLimit  int
	AuthRateWindow time.Duration
	UploadBasePath string
}

func Load() Config {
	ttlHours, _ := strconv.Atoi(getenv("SESSION_TTL_HOURS", "168"))
	authRateLimit, _ := strconv.Atoi(getenv("AUTH_RATE_LIMIT_ATTEMPTS", "20"))
	authRateWindowSeconds, _ := strconv.Atoi(getenv("AUTH_RATE_LIMIT_WINDOW_SECONDS", "60"))
	return Config{
		Addr:           getenv("ADDR", ":8080"),
		DatabaseURL:    getenv("DATABASE_URL", "postgres://nexora:nexora@localhost:5432/nexora_contacts?sslmode=disable"),
		PublicBaseURL:  strings.TrimRight(getenv("PUBLIC_BASE_URL", "http://localhost:3000"), "/"),
		CORSOrigins:    splitCSV(getenv("CORS_ORIGINS", "http://localhost:3000")),
		StorageDir:     getenv("STORAGE_DIR", "/data"),
		MigrationsDir:  getenv("MIGRATIONS_DIR", "migrations"),
		SessionSecret:  strings.TrimSpace(os.Getenv("SESSION_SECRET")),
		SessionTTL:     time.Duration(ttlHours) * time.Hour,
		RootPassword:   firstNonEmpty(os.Getenv("CONTACT_ROOT_PASSWORD"), os.Getenv("ADMIN_PASSWORD")),
		ValkeyURL:      getenv("VALKEY_URL", "redis://valkey:6379/0"),
		AuthRateLimit:  positiveInt(authRateLimit, 20),
		AuthRateWindow: time.Duration(positiveInt(authRateWindowSeconds, 60)) * time.Second,
		UploadBasePath: "/uploads",
	}
}

func (cfg Config) ValidateAuth() error {
	if err := validateRequiredSecret("SESSION_SECRET", cfg.SessionSecret, minSessionSecretLength); err != nil {
		return err
	}
	if err := validateRequiredSecret("CONTACT_ROOT_PASSWORD or ADMIN_PASSWORD", cfg.RootPassword, minRootPasswordLength); err != nil {
		return err
	}
	return nil
}

func (cfg Config) ValidateValkey() error {
	rawURL := strings.TrimSpace(cfg.ValkeyURL)
	if rawURL == "" {
		return fmt.Errorf("VALKEY_URL is required")
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("VALKEY_URL is invalid: %w", err)
	}
	if parsed.Scheme != "redis" && parsed.Scheme != "rediss" {
		return fmt.Errorf("VALKEY_URL must use redis:// or rediss://")
	}
	if parsed.Host == "" {
		return fmt.Errorf("VALKEY_URL must include a host")
	}
	if cfg.AuthRateLimit < 1 {
		return fmt.Errorf("AUTH_RATE_LIMIT_ATTEMPTS must be positive")
	}
	if cfg.AuthRateWindow <= 0 {
		return fmt.Errorf("AUTH_RATE_LIMIT_WINDOW_SECONDS must be positive")
	}
	return nil
}

func validateRequiredSecret(name string, value string, minLength int) error {
	value = strings.TrimSpace(value)
	if value == "" {
		return fmt.Errorf("%s is required", name)
	}
	if len(value) < minLength {
		return fmt.Errorf("%s must be at least %d characters", name, minLength)
	}
	if _, ok := placeholderSecrets[strings.ToLower(value)]; ok {
		return fmt.Errorf("%s must not use a placeholder value", name)
	}
	return nil
}

func getenv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func positiveInt(value, fallback int) int {
	if value > 0 {
		return value
	}
	return fallback
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
