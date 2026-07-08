package main

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"net/http"
	"testing"
)

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

func TestOptimizeContactPhotoConvertsToBoundedJPEG(t *testing.T) {
	source := image.NewRGBA(image.Rect(0, 0, 900, 700))
	for y := 0; y < source.Bounds().Dy(); y++ {
		for x := 0; x < source.Bounds().Dx(); x++ {
			source.SetRGBA(x, y, color.RGBA{
				R: uint8((x*3 + y*5) % 256),
				G: uint8((x*7 + y*11) % 256),
				B: uint8((x*13 + y*17) % 256),
				A: 255,
			})
		}
	}
	input := bytes.Buffer{}
	if err := png.Encode(&input, source); err != nil {
		t.Fatalf("encode source png: %v", err)
	}

	output, err := optimizeContactPhoto(input.Bytes())
	if err != nil {
		t.Fatalf("optimize contact photo: %v", err)
	}
	if len(output) > contactPhotoMaxBytes {
		t.Fatalf("optimized photo is %d bytes, expected <= %d", len(output), contactPhotoMaxBytes)
	}
	if contentType := http.DetectContentType(output); contentType != "image/jpeg" {
		t.Fatalf("content type = %s, expected image/jpeg", contentType)
	}
	config, _, err := image.DecodeConfig(bytes.NewReader(output))
	if err != nil {
		t.Fatalf("decode optimized jpeg config: %v", err)
	}
	if config.Width != contactPhotoSize || config.Height != contactPhotoSize {
		t.Fatalf("optimized dimensions = %dx%d, expected %dx%d", config.Width, config.Height, contactPhotoSize, contactPhotoSize)
	}
}
