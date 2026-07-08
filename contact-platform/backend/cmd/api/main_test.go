package main

import "testing"

func TestSlugifyTransliteratesCyrillic(t *testing.T) {
	tests := map[string]string{
		"Тест Карточка":           "test-kartochka",
		"Хаджиев Алил":            "hadzhiev-alil",
		"Нурматов Атай":           "nurmatov-atai",
		"Көчмөн Үй":               "kochmon-ui",
		"  Nexora Contact 2026  ": "nexora-contact-2026",
		"":                        "",
		"---":                     "card",
	}
	for input, expected := range tests {
		if got := slugify(input); got != expected {
			t.Fatalf("slugify(%q) = %q, expected %q", input, got, expected)
		}
	}
}
