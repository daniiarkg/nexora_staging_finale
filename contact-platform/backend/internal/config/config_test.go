package config

import (
	"strings"
	"testing"
)

func TestLoadDoesNotUseAuthFallbacks(t *testing.T) {
	t.Setenv("SESSION_SECRET", "")
	t.Setenv("CONTACT_ROOT_PASSWORD", "")
	t.Setenv("ADMIN_PASSWORD", "")

	cfg := Load()
	if cfg.SessionSecret != "" {
		t.Fatal("expected empty session secret when env is missing")
	}
	if cfg.RootPassword != "" {
		t.Fatal("expected empty root password when env is missing")
	}
	if err := cfg.ValidateAuth(); err == nil {
		t.Fatal("expected auth validation to fail without secrets")
	}
}

func TestValidateAuthRejectsPlaceholderSecrets(t *testing.T) {
	cfg := Config{
		SessionSecret: "change-me-in-production",
		RootPassword:  "strong-root-password",
	}
	if err := cfg.ValidateAuth(); err == nil {
		t.Fatal("expected placeholder session secret to be rejected")
	}

	cfg.SessionSecret = strings.Repeat("s", minSessionSecretLength)
	cfg.RootPassword = "change-me-root-password"
	if err := cfg.ValidateAuth(); err == nil {
		t.Fatal("expected placeholder root password to be rejected")
	}
}

func TestValidateAuthAcceptsConfiguredSecrets(t *testing.T) {
	t.Setenv("SESSION_SECRET", strings.Repeat("s", minSessionSecretLength))
	t.Setenv("CONTACT_ROOT_PASSWORD", "")
	t.Setenv("ADMIN_PASSWORD", "strong-root-password")

	cfg := Load()
	if cfg.RootPassword != "strong-root-password" {
		t.Fatalf("expected ADMIN_PASSWORD fallback, got %q", cfg.RootPassword)
	}
	if err := cfg.ValidateAuth(); err != nil {
		t.Fatalf("expected valid auth config: %v", err)
	}
}

func TestValidateValkeyRejectsInvalidURL(t *testing.T) {
	cfg := Config{ValkeyURL: "http://valkey:6379"}
	if err := cfg.ValidateValkey(); err == nil {
		t.Fatal("expected non-redis Valkey URL to be rejected")
	}

	cfg.ValkeyURL = "redis://"
	if err := cfg.ValidateValkey(); err == nil {
		t.Fatal("expected Valkey URL without host to be rejected")
	}
}

func TestValidateValkeyAcceptsRedisURL(t *testing.T) {
	cfg := Load()
	if cfg.ValkeyURL != "redis://valkey:6379/0" {
		t.Fatalf("expected default Valkey URL, got %q", cfg.ValkeyURL)
	}
	if err := cfg.ValidateValkey(); err != nil {
		t.Fatalf("expected valid Valkey config: %v", err)
	}
}
