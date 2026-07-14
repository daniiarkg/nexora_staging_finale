"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Card, LanguageCode, TranslationDictionary, TranslationCopy } from "@/lib/types";
import { defaultDesign } from "@/lib/design-presets";
import { copyForLanguage, languages, normalizeLanguage, normalizeTranslations, vcfLabelFor } from "@/lib/i18n";
import { designCardBackground, designStageBackground, meshAnimationClass } from "@/lib/mesh-gradient";

export function emptyCard(): Card {
  return {
    slug: "",
    type: "person",
    status: "draft",
    preferred_language: "ru",
    name: "",
    name_translations: {},
    position: "",
    position_translations: {},
    company: "",
    email: "",
    website: "",
    address: "",
    address_geo_uri: "",
    phones: [""],
    socials: {},
    photo_url: "",
    logo_url: "",
    hide_logo: false,
    design: { ...defaultDesign },
    vcf_button: { enabled: true, label: "Скачать VCF" },
    custom_fields: [],
    products: []
  };
}

export function demoCard(): Card {
  return {
    ...emptyCard(),
    slug: "demo",
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
    custom_fields: [{ label: "Office", value: "Mon-Fri, 10:00-18:00", type: "text" }],
    products: []
  };
}

function externalHref(value: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function mapsHref(address: string, geoURI = "") {
  if (geoURI) return geoURI;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function socialActions(card: Card) {
  const socials = card.socials || {};
  return [
    { key: "instagram", label: "Instagram", href: socials.instagram },
    { key: "whatsapp", label: "WhatsApp", href: socials.whatsapp },
    { key: "telegram", label: "Telegram", href: socials.telegram }
  ].filter((item): item is { key: "instagram" | "whatsapp" | "telegram"; label: string; href: string } => Boolean(item.href));
}

type CardPreviewProps = {
  card: Card;
  vcfHref?: string;
  translations?: Partial<TranslationDictionary>;
};

function fontFamily(value: Card["design"]["font_family"]) {
  const families = {
    system: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
    serif: "Georgia, \"Times New Roman\", serif",
    mono: "\"SFMono-Regular\", Consolas, \"Liberation Mono\", monospace",
    rounded: "ui-rounded, \"Avenir Next\", \"Nunito\", \"Segoe UI\", sans-serif"
  };
  return families[value] || families.system;
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="download-icon">
      <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function SocialIcon({ type }: { type: "instagram" | "whatsapp" | "telegram" }) {
  if (type === "instagram") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="social-icon">
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.2" />
        <path d="M16.8 7.2h.01" />
      </svg>
    );
  }
  if (type === "whatsapp") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="social-icon">
        <path d="M5.2 19.4 6.3 16A7.4 7.4 0 1 1 9 18.6l-3.8.8Z" />
        <path d="M9.4 8.8c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.6 1.4c.1.2 0 .5-.1.6l-.4.5c.6 1.1 1.4 1.9 2.6 2.5l.5-.5c.2-.2.4-.2.7-.1l1.4.7c.3.1.4.3.4.6v.5c0 .3-.2.6-.5.7-.5.2-1.1.3-1.8.1-2.9-.7-5.1-2.9-5.9-5.7-.2-.7 0-1.3.2-1.9Z" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="social-icon">
      <path d="M21 4.5 3.8 11.3c-.8.3-.8 1.4.1 1.6l4.4 1.3 1.7 5c.2.8 1.3.9 1.7.2l2.4-3.5 4.6 3.4c.7.5 1.6.1 1.7-.8L22 5.5c.1-.7-.4-1.2-1-1Z" />
      <path d="m8.4 14.1 9-5.5-6.6 7.4" />
    </svg>
  );
}

function localizedValue(values: Card["name_translations"] | undefined, language: LanguageCode, fallback: string) {
  return values?.[language]?.trim() || fallback;
}

function LanguageSwitcher({ language, copy, onChange }: { language: LanguageCode; copy: TranslationCopy; onChange: (language: LanguageCode) => void }) {
  const labels: Record<LanguageCode, string> = {
    ru: copy.language_ru,
    en: copy.language_en,
    ky: copy.language_ky
  };
  return (
    <details className="language-switcher">
      <summary aria-label={copy.language_menu_label} title={copy.language_menu_label}>
        <span className="language-burger" aria-hidden="true"><span /><span /><span /></span>
        <b>{language.toUpperCase()}</b>
      </summary>
      <div className="language-menu">
        {languages.map((item) => (
          <button
            type="button"
            key={item.code}
            className={item.code === language ? "is-active" : ""}
            onClick={(event) => {
              onChange(item.code);
              event.currentTarget.closest("details")?.removeAttribute("open");
            }}
          >
            {labels[item.code] || item.nativeLabel}
          </button>
        ))}
      </div>
    </details>
  );
}

export function CardPreview({ card, vcfHref = "", translations }: CardPreviewProps) {
  const design = { ...defaultDesign, ...(card.design || {}) };
  const normalizedTranslations = useMemo(() => normalizeTranslations(translations), [translations]);
  const [language, setLanguage] = useState<LanguageCode>(() => normalizeLanguage(card.preferred_language));
  useEffect(() => {
    setLanguage(normalizeLanguage(card.preferred_language));
  }, [card.preferred_language]);
  const copy = useMemo(() => copyForLanguage(normalizedTranslations, language), [language, normalizedTranslations]);
  const background = designStageBackground(design);
  const cardBackground = designCardBackground(design);
  const profileLogo = card.logo_url || "";
  const designLogo = design.logo_url || "";
  const logo = card.hide_logo ? "" : (profileLogo || designLogo);
  const logoMinWidth = !profileLogo && designLogo ? Math.min(Math.max(design.logo_min_width || 250, 120), 420) : 250;
  const watermark = design.watermark && logo ? logo : "";
  const phones = card.phones || [];
  const products = card.products || [];
  const customFields = card.custom_fields || [];
  const socials = socialActions(card);
  const vcfButton = card.vcf_button || { enabled: true, label: "Скачать VCF" };
  const vcfLabel = vcfLabelFor(vcfButton.label, copy);
  const displayName = localizedValue(card.name_translations, language, card.name);
  const position = localizedValue(card.position_translations, language, card.position);
  const fontScale = Math.min(Math.max(design.font_size || 100, 82), 122) / 100;
  const stageAnimationClass = design.background_type === "mesh" ? meshAnimationClass(design.background_mesh.animation) : "";
  const cardAnimationClass = design.card_background_type === "mesh" ? meshAnimationClass(design.card_mesh.animation) : "";
  const gradientStageClass = design.background_type === "gradient" && design.gradient_animated ? " is-animated-gradient" : "";
  const gradientCardClass = design.card_background_type === "gradient" && design.card_gradient_animated ? " is-animated-gradient" : "";
  return (
    <section
      className={`preview-stage${gradientStageClass}${stageAnimationClass}`}
      data-layout={design.layout}
      style={{
        background,
        "--gradient-animation-speed": `${design.gradient_animation_speed || 10}s`,
        "--mesh-animation-speed": `${design.background_mesh.animation_speed || 10}s`
      } as CSSProperties & Record<string, string>}
    >
      <div className="preview-card-stack">
        <article
          className={`preview-card${gradientCardClass}${cardAnimationClass}`}
          data-card-type={card.type}
          style={{
            background: cardBackground,
            color: design.text_color || "#030609",
            "--button-color": design.button_color || "#0a844a",
            "--card-font-family": fontFamily(design.font_family),
            "--card-font-scale": String(fontScale),
            "--card-font-weight": String(design.font_weight || 700),
            "--card-logo-min-width": `${logoMinWidth}px`,
            "--gradient-animation-speed": `${design.card_gradient_animation_speed || 10}s`,
            "--mesh-animation-speed": `${design.card_mesh.animation_speed || 10}s`
          } as CSSProperties & Record<string, string>}
        >
          <div className="preview-card-bg">
            {watermark ? <img className="preview-watermark" src={watermark} alt="" /> : null}
          </div>
          {design.top_image_url ? <img className="preview-edge-image preview-edge-image-top" src={design.top_image_url} alt="" /> : null}
          <header className="preview-header">
            {logo ? <img className="preview-logo" src={logo} alt="Logo" /> : <span className="preview-logo-placeholder" />}
            <LanguageSwitcher language={language} copy={copy} onChange={setLanguage} />
          </header>
          <div className="preview-identity">
            {card.photo_url ? <img className="preview-avatar" src={card.photo_url} alt={displayName || card.name} /> : null}
            <div>
              <h1>{displayName || (card.type === "store" ? copy.store_name_placeholder : copy.person_name_placeholder)}</h1>
              {position ? <p className="preview-sub">{position}</p> : null}
              {card.company && card.type === "person" ? <p className="preview-company">{card.company}</p> : null}
            </div>
          </div>
          {card.type === "store" && products.length ? (
            <div className="preview-products">
              {products.map((product, index) => (
                <div className="preview-product" key={`${product.title}-${index}`}>
                  {product.photo_url ? <img src={product.photo_url} alt={product.title} /> : <span />}
                  <b>{product.title || copy.product_placeholder}</b>
                  {product.price ? <small>{product.price}</small> : null}
                </div>
              ))}
            </div>
          ) : null}
          <div className="preview-actions">
            {phones.filter(Boolean).map((phone, index) => (
              <a key={`${phone}-${index}`} href={`tel:${phone}`}>
                <span>{copy.phone_label}{index ? ` ${index + 1}` : ""}</span>
                <b>{phone}</b>
              </a>
            ))}
            {card.email ? <a href={`mailto:${card.email}`}><span>{copy.email_label}</span><b>{card.email}</b></a> : null}
            {card.website ? <a href={externalHref(card.website)} target="_blank" rel="noreferrer"><span>{copy.website_label}</span><b>{card.website.replace(/^https?:\/\//, "")}</b></a> : null}
            {card.address || card.address_geo_uri ? <a href={mapsHref(card.address, card.address_geo_uri)} target="_blank" rel="noreferrer"><span>{copy.address_label}</span><b>{card.address || copy.open_map_label}</b></a> : null}
            {socials.map((social) => (
              <a className="preview-social-action" key={social.key} href={externalHref(social.href)} target="_blank" rel="noreferrer" aria-label={social.label}>
                <SocialIcon type={social.key} />
                <b>{social.label}</b>
              </a>
            ))}
            {customFields.map((field, index) => (
              <a key={`${field.label}-${index}`} href={field.type === "link" ? externalHref(field.value) : undefined} target={field.type === "link" ? "_blank" : undefined} rel={field.type === "link" ? "noreferrer" : undefined}>
                <span>{field.label}</span>
                <b>{field.value}</b>
              </a>
            ))}
          </div>
          {vcfButton.enabled ? (
            <a className="preview-vcf-button" href={vcfHref || undefined}>
              <DownloadIcon />
              <span>{vcfLabel}</span>
            </a>
          ) : null}
          {design.bottom_image_url ? <img className="preview-edge-image preview-edge-image-bottom" src={design.bottom_image_url} alt="" /> : null}
          {design.layout === "nexora_default" ? (
            <footer className="preview-nexora-footer">
              <strong>Nexora Group</strong>
              <p>{copy.nexora_footer_description}</p>
              <a href="https://nexora.kg" target="_blank" rel="noreferrer">nexora.kg</a>
            </footer>
          ) : null}
        </article>
      </div>
    </section>
  );
}
