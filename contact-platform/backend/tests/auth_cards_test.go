package tests

import (
	"testing"

	"nexora/contact-platform/backend/internal/auth"
	"nexora/contact-platform/backend/internal/models"
	"nexora/contact-platform/backend/internal/vcf"
)

func TestPasswordHashAndVerify(t *testing.T) {
	hash, err := auth.HashPassword("strong-password")
	if err != nil {
		t.Fatal(err)
	}
	if !auth.VerifyPassword(hash, "strong-password") {
		t.Fatal("expected password to verify")
	}
	if auth.VerifyPassword(hash, "wrong-password") {
		t.Fatal("wrong password verified")
	}
}

func TestVCFIncludesCompanyPhonesWebsiteAndAddress(t *testing.T) {
	card := models.Card{
		Name:     "Test Person",
		Position: "CEO",
		Company:  "Acme",
		Phones:   []string{"+996 555 123 456", "+996 700 123 456"},
		Email:    "test@example.com",
		Website:  "https://example.com",
		Address:  "Bishkek",
	}
	body := vcf.Render(card, "https://contact.nexora.kg/cards/test")
	for _, expected := range []string{"ORG:Acme", "TITLE:CEO", "TEL;TYPE=CELL,VOICE:+996 555 123 456", "URL;TYPE=WORK:https://example.com", "ADR;TYPE=WORK:;;Bishkek;;;;"} {
		if !contains(body, expected) {
			t.Fatalf("expected %q in vcf:\n%s", expected, body)
		}
	}
}

func contains(body, needle string) bool {
	for i := 0; i+len(needle) <= len(body); i++ {
		if body[i:i+len(needle)] == needle {
			return true
		}
	}
	return false
}
