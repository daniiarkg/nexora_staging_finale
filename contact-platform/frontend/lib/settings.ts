import type { AppSettings, Card } from "./types";
import { defaultDesign } from "./design-presets";

const defaultLogo = "/nexora-text-logo.svg";

export function defaultLandingCard(logoURL = defaultLogo): Card {
  return {
    slug: "demo",
    type: "person",
    status: "published",
    name: "Айбек Осмонов",
    position: "AI Operations Consultant",
    company: "Nexora Group",
    email: "demo@nexora.kg",
    website: "https://nexora.kg",
    address: "Бишкек",
    address_geo_uri: "geo:42.8746,74.5698",
    phones: ["+996 555 123 456"],
    socials: { telegram: "https://t.me/nexora" },
    photo_url: "",
    logo_url: "",
    hide_logo: false,
    design: { ...defaultDesign, logo_url: logoURL },
    vcf_button: { enabled: true, label: "Сохранить контакт" },
    custom_fields: [{ label: "Office", value: "Mon-Fri, 10:00-18:00", type: "text" }],
    products: []
  };
}

export function defaultSettings(): AppSettings {
  return {
    favicon_url: defaultLogo,
    landing_logo_url: defaultLogo,
    landing_eyebrow: "Nexora Contacts",
    landing_title: "Контактные карточки и мини-витрины без лишней возни.",
    landing_lead: "Публичные ссылки, VCF, несколько телефонов, товары, кастомный дизайн и предпросмотр в одном аккуратном рабочем интерфейсе.",
    landing_primary_label: "Войти",
    landing_primary_href: "/login",
    landing_secondary_label: "Регистрация",
    landing_secondary_href: "/register",
    landing_features: ["Person cards", "Store catalog", "VCF export"],
    landing_card: defaultLandingCard(defaultLogo)
  };
}

export function withSettingsDefaults(settings?: Partial<AppSettings>): AppSettings {
  const defaults = defaultSettings();
  const landingLogo = settings?.landing_logo_url || defaults.landing_logo_url;
  return {
    ...defaults,
    ...(settings || {}),
    landing_logo_url: landingLogo,
    landing_features: settings?.landing_features?.length ? settings.landing_features : defaults.landing_features,
    landing_card: {
      ...defaults.landing_card,
      ...(settings?.landing_card || {}),
      design: {
        ...defaults.landing_card.design,
        ...(settings?.landing_card?.design || {}),
        logo_url: landingLogo
      },
      vcf_button: {
        ...defaults.landing_card.vcf_button,
        ...(settings?.landing_card?.vcf_button || {})
      },
      phones: settings?.landing_card?.phones?.length ? settings.landing_card.phones : defaults.landing_card.phones,
      custom_fields: settings?.landing_card?.custom_fields || defaults.landing_card.custom_fields,
      products: settings?.landing_card?.products || defaults.landing_card.products
    }
  };
}
