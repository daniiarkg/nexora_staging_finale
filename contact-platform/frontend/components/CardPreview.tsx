import type { CSSProperties } from "react";
import type { Card } from "@/lib/types";
import { defaultDesign } from "@/lib/design-presets";
import { designCardBackground, designStageBackground, meshAnimationClass } from "@/lib/mesh-gradient";

export function emptyCard(): Card {
  return {
    slug: "",
    type: "person",
    status: "draft",
    name: "",
    position: "",
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
    ["Telegram", socials.telegram],
    ["WhatsApp", socials.whatsapp],
    ["Instagram", socials.instagram],
    ["LinkedIn", socials.linkedin]
  ].filter((item): item is [string, string] => Boolean(item[1]));
}

type CardPreviewProps = {
  card: Card;
  vcfHref?: string;
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

export function CardPreview({ card, vcfHref = "" }: CardPreviewProps) {
  const design = { ...defaultDesign, ...(card.design || {}) };
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
  const fontScale = Math.min(Math.max(design.font_size || 100, 82), 122) / 100;
  const stageAnimationClass = design.background_type === "mesh" ? meshAnimationClass(design.background_mesh.animation) : "";
  const cardAnimationClass = design.card_background_type === "mesh" ? meshAnimationClass(design.card_mesh.animation) : "";
  const gradientStageClass = design.background_type === "gradient" && design.gradient_animated ? " is-animated-gradient" : "";
  const gradientCardClass = design.card_background_type === "gradient" && design.card_gradient_animated ? " is-animated-gradient" : "";
  return (
    <section className={`preview-stage${gradientStageClass}${stageAnimationClass}`} data-layout={design.layout} style={{ background }}>
      <div className="preview-card-stack">
        {design.top_image_url ? <img className="preview-edge-image" src={design.top_image_url} alt="" /> : null}
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
            "--card-logo-min-width": `${logoMinWidth}px`
          } as CSSProperties & Record<string, string>}
        >
          <div className="preview-card-bg">
            {watermark ? <img className="preview-watermark" src={watermark} alt="" /> : null}
          </div>
          <header className="preview-header">
            {logo ? <img className="preview-logo" src={logo} alt="Logo" /> : <span className="preview-logo-placeholder" />}
            <span className="preview-status">{card.type === "store" ? "Store" : "Contact"}</span>
          </header>
          <div className="preview-identity">
            {card.photo_url ? <img className="preview-avatar" src={card.photo_url} alt={card.name} /> : null}
            <div>
              <p className="eyebrow">{card.type === "store" ? "Digital storefront" : "Digital contact"}</p>
              <h1>{card.name || (card.type === "store" ? "Название магазина" : "Имя Фамилия")}</h1>
              {card.position ? <p className="preview-sub">{card.position}</p> : null}
              {card.company && card.type === "person" ? <p className="preview-company">{card.company}</p> : null}
            </div>
          </div>
          {card.type === "store" && products.length ? (
            <div className="preview-products">
              {products.map((product, index) => (
                <div className="preview-product" key={`${product.title}-${index}`}>
                  {product.photo_url ? <img src={product.photo_url} alt={product.title} /> : <span />}
                  <b>{product.title || "Товар"}</b>
                  {product.price ? <small>{product.price}</small> : null}
                </div>
              ))}
            </div>
          ) : null}
          <div className="preview-actions">
            {phones.filter(Boolean).map((phone, index) => (
              <a key={`${phone}-${index}`} href={`tel:${phone}`}>
                <span>Phone {index ? index + 1 : ""}</span>
                <b>{phone}</b>
              </a>
            ))}
            {card.email ? <a href={`mailto:${card.email}`}><span>Email</span><b>{card.email}</b></a> : null}
            {card.website ? <a href={externalHref(card.website)} target="_blank" rel="noreferrer"><span>Website</span><b>{card.website.replace(/^https?:\/\//, "")}</b></a> : null}
            {card.address || card.address_geo_uri ? <a href={mapsHref(card.address, card.address_geo_uri)} target="_blank" rel="noreferrer"><span>Address</span><b>{card.address || "Открыть в карте"}</b></a> : null}
            {socials.map(([label, href]) => (
              <a key={label} href={externalHref(href)} target="_blank" rel="noreferrer">
                <span>{label}</span>
                <b>{href.replace(/^https?:\/\//, "")}</b>
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
              <span>{vcfButton.label || "Скачать VCF"}</span>
            </a>
          ) : null}
        </article>
        {design.bottom_image_url ? <img className="preview-edge-image" src={design.bottom_image_url} alt="" /> : null}
      </div>
    </section>
  );
}
