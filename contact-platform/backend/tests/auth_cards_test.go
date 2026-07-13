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
		Socials: models.Socials{
			Instagram: "https://instagram.com/acme",
			Whatsapp:  "https://wa.me/996555123456",
			Telegram:  "https://t.me/acme",
		},
	}
	body := vcf.Render(card, "https://contact.nexora.kg/cards/test")
	for _, expected := range []string{"FN:Test Person", "N:Test Person;;;;", "ORG:Acme", "TITLE:CEO\\, Acme", "TEL;TYPE=CELL,VOICE:+996 555 123 456", "URL;TYPE=WORK:https://example.com", "ADR;TYPE=WORK:;;Bishkek;;;;", "URL;TYPE=INSTAGRAM:https://instagram.com/acme", "URL;TYPE=WHATSAPP:https://wa.me/996555123456", "URL;TYPE=TELEGRAM:https://t.me/acme"} {
		if !contains(body, expected) {
			t.Fatalf("expected %q in vcf:\n%s", expected, body)
		}
	}
	if contains(body, "URL:https://contact.nexora.kg/cards/test") {
		t.Fatalf("card public URL must not be included in vcf:\n%s", body)
	}
}

func TestVCFOmitsDefaultCompanyForPersonWithoutCompany(t *testing.T) {
	card := models.Card{
		Name:     "No Company",
		Position: "Designer",
		Phones:   []string{"+996 555 123 456"},
	}
	body := vcf.Render(card, "https://contact.nexora.kg/cards/no-company")
	for _, unexpected := range []string{"ORG:Nexora Group", "ORG:", "URL:https://contact.nexora.kg/cards/no-company"} {
		if contains(body, unexpected) {
			t.Fatalf("did not expect %q in vcf:\n%s", unexpected, body)
		}
	}
	for _, expected := range []string{"FN:No Company", "N:No Company;;;;", "TITLE:Designer"} {
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
