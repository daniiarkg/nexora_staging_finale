export type Role = "super_user" | "user";

export type LanguageCode = "ru" | "en" | "ky";

export type TranslationKey =
  | "language_menu_label"
  | "language_ru"
  | "language_en"
  | "language_ky"
  | "phone_label"
  | "email_label"
  | "website_label"
  | "address_label"
  | "open_map_label"
  | "vcf_save_label"
  | "person_name_placeholder"
  | "store_name_placeholder"
  | "product_placeholder";

export type TranslationCopy = Record<TranslationKey, string>;

export type TranslationDictionary = Record<LanguageCode, TranslationCopy>;

export type LocalizedText = Partial<Record<LanguageCode, string>>;

export type User = {
  id: string;
  email: string;
  role: Role;
};

export type Product = {
  id?: string;
  photo_url?: string;
  title: string;
  price: string;
  sort_order?: number;
};

export type CustomField = {
  label: string;
  value: string;
  type: "text" | "link" | "phone" | "email";
  sort_order?: number;
};

export type BackgroundType = "solid" | "gradient" | "mesh";

export type MeshAnimationPreset = "none" | "drift" | "pulse" | "orbit" | "breathe";

export type MeshPoint = {
  id: string;
  x: number;
  y: number;
  color: string;
  opacity: number;
  radius: number;
};

export type MeshGradientConfig = {
  preset: string;
  animation: MeshAnimationPreset;
  animation_speed: number;
  points: MeshPoint[];
};

export type DesignConfig = {
  background_type: BackgroundType;
  background_value: string;
  background_mesh: MeshGradientConfig;
  card_background_type: BackgroundType;
  card_background_value: string;
  card_color: string;
  card_gradient_from: string;
  card_gradient_to: string;
  card_gradient_angle: number;
  card_gradient_animated: boolean;
  card_gradient_animation_speed: number;
  card_mesh: MeshGradientConfig;
  button_color: string;
  text_color: string;
  logo_url: string;
  logo_min_width: number;
  top_image_url: string;
  bottom_image_url: string;
  gradient_from: string;
  gradient_to: string;
  gradient_angle: number;
  gradient_animated: boolean;
  gradient_animation_speed: number;
  font_family: "system" | "serif" | "mono" | "rounded";
  font_weight: number;
  font_size: number;
  layout: string;
  watermark: boolean;
};

export type VCFButton = {
  enabled: boolean;
  label: string;
};

export type Card = {
  id?: string;
  owner_id?: string;
  slug: string;
  type: "person" | "store";
  status: "draft" | "published";
  preferred_language: LanguageCode;
  name: string;
  name_translations: LocalizedText;
  position: string;
  position_translations: LocalizedText;
  company: string;
  email: string;
  website: string;
  address: string;
  address_geo_uri: string;
  phones: string[];
  socials: {
    instagram?: string;
    linkedin?: string;
    whatsapp?: string;
    telegram?: string;
  };
  photo_url: string;
  logo_url: string;
  hide_logo: boolean;
  design_id?: string;
  design: DesignConfig;
  vcf_button: VCFButton;
  custom_fields: CustomField[];
  products: Product[];
  created_at?: string;
  updated_at?: string;
  published_at?: string;
};

export type Design = DesignConfig & {
  id?: string;
  name: string;
};

export type AppSettings = {
  default_logo_url?: string;
  favicon_url: string;
  translations: TranslationDictionary;
  landing_logo_url: string;
  landing_logo_min_width: number;
  landing_card_logo_min_width: number;
  landing_eyebrow: string;
  landing_title: string;
  landing_lead: string;
  landing_primary_label: string;
  landing_primary_href: string;
  landing_secondary_label: string;
  landing_secondary_href: string;
  landing_features: string[];
  landing_card: Card;
};
