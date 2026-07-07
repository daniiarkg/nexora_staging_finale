export type Role = "super_user" | "user";

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

export type DesignConfig = {
  background_type: "solid" | "gradient";
  background_value: string;
  card_color: string;
  button_color: string;
  text_color: string;
  logo_url: string;
  logo_min_width: number;
  gradient_from: string;
  gradient_to: string;
  gradient_angle: number;
  gradient_animated: boolean;
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
  name: string;
  position: string;
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
};

export type Design = DesignConfig & {
  id?: string;
  name: string;
};

export type AppSettings = {
  default_logo_url?: string;
  favicon_url: string;
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
