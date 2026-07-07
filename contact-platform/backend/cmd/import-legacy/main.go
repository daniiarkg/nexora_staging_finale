package main

import (
	"context"
	"encoding/json"
	"log"
	"os"

	"nexora/contact-platform/backend/internal/config"
	"nexora/contact-platform/backend/internal/db"
	"nexora/contact-platform/backend/internal/models"
	"nexora/contact-platform/backend/internal/store"
)

type legacyContact struct {
	Slug         string               `json:"slug"`
	FullName     string               `json:"fullName"`
	Position     string               `json:"position"`
	Company      string               `json:"company"`
	Phone        string               `json:"phone"`
	Phones       []string             `json:"phones"`
	Email        string               `json:"email"`
	Website      string               `json:"website"`
	Address      string               `json:"address"`
	CardType     string               `json:"cardType"`
	Theme        string               `json:"theme"`
	Socials      models.Socials       `json:"socials"`
	Photo        *legacyAsset         `json:"photo"`
	Logo         *legacyAsset         `json:"logo"`
	HideLogo     bool                 `json:"hideLogo"`
	Products     []legacyProduct      `json:"products"`
	CustomFields []models.CustomField `json:"customFields"`
}

type legacyAsset struct {
	URL string `json:"url"`
}

type legacyProduct struct {
	Title string       `json:"title"`
	Price string       `json:"price"`
	Photo *legacyAsset `json:"photo"`
}

func main() {
	if len(os.Args) < 2 {
		log.Fatal("usage: import-legacy /path/to/contacts.json")
	}
	ctx := context.Background()
	cfg := config.Load()
	pool, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()
	if err := db.Migrate(ctx, pool, cfg.MigrationsDir); err != nil {
		log.Fatal(err)
	}

	raw, err := os.ReadFile(os.Args[1])
	if err != nil {
		log.Fatal(err)
	}
	var legacy []legacyContact
	if err := json.Unmarshal(raw, &legacy); err != nil {
		log.Fatal(err)
	}

	st := store.New(pool)
	root, err := st.GetUserByEmail(ctx, "root")
	if err != nil {
		log.Fatal("root user must exist before import: ", err)
	}
	for _, item := range legacy {
		phones := item.Phones
		if len(phones) == 0 && item.Phone != "" {
			phones = []string{item.Phone}
		}
		cardType := item.CardType
		if cardType == "" {
			cardType = models.CardTypePerson
		}
		design := designFromLegacyTheme(item.Theme)
		card := models.Card{
			OwnerID:      root.ID,
			Slug:         item.Slug,
			Type:         cardType,
			Status:       models.StatusPublished,
			Name:         item.FullName,
			Position:     item.Position,
			Company:      item.Company,
			Email:        item.Email,
			Website:      item.Website,
			Address:      item.Address,
			Phones:       phones,
			Socials:      item.Socials,
			PhotoURL:     assetURL(item.Photo),
			LogoURL:      assetURL(item.Logo),
			HideLogo:     item.HideLogo,
			Products:     productsFromLegacy(item.Products),
			CustomFields: item.CustomFields,
			Design:       design,
		}
		if _, err := st.CreateCard(ctx, card); err != nil {
			log.Printf("skip %s: %v", item.Slug, err)
		}
	}
}

func assetURL(asset *legacyAsset) string {
	if asset == nil {
		return ""
	}
	return asset.URL
}

func productsFromLegacy(products []legacyProduct) []models.Product {
	out := make([]models.Product, 0, len(products))
	for index, product := range products {
		out = append(out, models.Product{
			PhotoURL:  assetURL(product.Photo),
			Title:     product.Title,
			Price:     product.Price,
			SortOrder: index,
		})
	}
	return out
}

func designFromLegacyTheme(theme string) models.DesignConfig {
	switch theme {
	case "white":
		return models.DesignConfig{
			BackgroundType:  "solid",
			BackgroundValue: "#f4f4f5",
			CardColor:       "#ffffff",
			ButtonColor:     "#111111",
			TextColor:       "#111111",
			Layout:          "white",
			Watermark:       false,
		}
	case "dark":
		return models.DesignConfig{
			BackgroundType:  "solid",
			BackgroundValue: "#080808",
			CardColor:       "#000000",
			ButtonColor:     "#ffffff",
			TextColor:       "#f4f4f5",
			Layout:          "dark",
			Watermark:       false,
		}
	default:
		return models.DesignConfig{
			BackgroundType:  "solid",
			BackgroundValue: "#edffef",
			CardColor:       "#edffef",
			ButtonColor:     "#0a844a",
			TextColor:       "#030609",
			Layout:          "nexora_default",
			Watermark:       true,
		}
	}
}
