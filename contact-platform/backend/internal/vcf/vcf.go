package vcf

import (
	"strings"

	"nexora/contact-platform/backend/internal/geo"
	"nexora/contact-platform/backend/internal/models"
)

func Render(card models.Card, publicURL string) string {
	lines := []string{
		"BEGIN:VCARD",
		"VERSION:3.0",
		"FN:" + esc(card.Name),
		"ORG:" + esc(org(card)),
		"URL:" + publicURL,
	}
	if card.Position != "" {
		lines = append(lines, "TITLE:"+esc(card.Position))
	}
	for _, phone := range card.Phones {
		if strings.TrimSpace(phone) != "" {
			lines = append(lines, "TEL;TYPE=CELL,VOICE:"+esc(phone))
		}
	}
	if card.Email != "" {
		lines = append(lines, "EMAIL;TYPE=INTERNET:"+esc(card.Email))
	}
	if card.Website != "" {
		lines = append(lines, "URL;TYPE=WORK:"+card.Website)
	}
	if card.Address != "" {
		lines = append(lines, "ADR;TYPE=WORK:;;"+esc(card.Address)+";;;;")
	}
	if lat, lon, ok := geo.Coordinates(card.AddressGeoURI); ok {
		lines = append(lines, "GEO:"+lat+";"+lon)
		lines = append(lines, "URL;TYPE=MAP:"+card.AddressGeoURI)
	}
	for _, social := range socialLinks(card.Socials) {
		lines = append(lines, "URL;TYPE="+social.label+":"+social.href)
	}
	for _, field := range card.CustomFields {
		if field.Type == "link" && field.Value != "" {
			lines = append(lines, "URL;TYPE="+strings.ToUpper(safeType(field.Label))+":"+field.Value)
		}
	}
	lines = append(lines, "END:VCARD")
	return strings.Join(foldLines(lines), "\r\n") + "\r\n"
}

func socialLinks(socials models.Socials) []struct {
	label string
	href  string
} {
	out := []struct {
		label string
		href  string
	}{}
	for _, item := range []struct {
		label string
		href  string
	}{
		{"INSTAGRAM", socials.Instagram},
		{"WHATSAPP", socials.Whatsapp},
		{"TELEGRAM", socials.Telegram},
	} {
		if strings.TrimSpace(item.href) != "" {
			item.href = strings.TrimSpace(item.href)
			out = append(out, item)
		}
	}
	return out
}

func org(card models.Card) string {
	if card.Company != "" {
		return card.Company
	}
	if card.Type == models.CardTypeStore {
		return card.Name
	}
	return "Nexora Group"
}

func esc(value string) string {
	return strings.NewReplacer("\\", "\\\\", "\n", "\\n", ",", "\\,", ";", "\\;").Replace(value)
}

func safeType(value string) string {
	out := strings.Builder{}
	for _, r := range value {
		if r >= 'A' && r <= 'Z' || r >= 'a' && r <= 'z' || r >= '0' && r <= '9' {
			out.WriteRune(r)
		}
	}
	if out.Len() == 0 {
		return "CUSTOM"
	}
	return out.String()
}

func foldLines(lines []string) []string {
	out := make([]string, 0, len(lines))
	for _, line := range lines {
		for len(line) > 74 {
			out = append(out, line[:74])
			line = " " + line[74:]
		}
		out = append(out, line)
	}
	return out
}
