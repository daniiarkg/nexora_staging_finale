package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

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
	UploadBasePath string
}

func Load() Config {
	ttlHours, _ := strconv.Atoi(getenv("SESSION_TTL_HOURS", "168"))
	return Config{
		Addr:           getenv("ADDR", ":8080"),
		DatabaseURL:    getenv("DATABASE_URL", "postgres://nexora:nexora@localhost:5432/nexora_contacts?sslmode=disable"),
		PublicBaseURL:  strings.TrimRight(getenv("PUBLIC_BASE_URL", "http://localhost:3000"), "/"),
		CORSOrigins:    splitCSV(getenv("CORS_ORIGINS", "http://localhost:3000")),
		StorageDir:     getenv("STORAGE_DIR", "/data"),
		MigrationsDir:  getenv("MIGRATIONS_DIR", "migrations"),
		SessionSecret:  getenv("SESSION_SECRET", "change-me-in-production"),
		SessionTTL:     time.Duration(ttlHours) * time.Hour,
		RootPassword:   firstNonEmpty(os.Getenv("CONTACT_ROOT_PASSWORD"), os.Getenv("ADMIN_PASSWORD"), "change-me-root-password"),
		UploadBasePath: "/uploads",
	}
}

func getenv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
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
