CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_user', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  background_type TEXT NOT NULL DEFAULT 'solid',
  background_value TEXT NOT NULL DEFAULT '#edffef',
  background_mesh JSONB NOT NULL DEFAULT '{}'::jsonb,
  card_background_type TEXT NOT NULL DEFAULT 'solid',
  card_background_value TEXT NOT NULL DEFAULT '#edffef',
  card_color TEXT NOT NULL DEFAULT '#edffef',
  card_gradient_from TEXT NOT NULL DEFAULT '#edffef',
  card_gradient_to TEXT NOT NULL DEFAULT '#0a844a',
  card_gradient_angle INTEGER NOT NULL DEFAULT 135,
  card_gradient_animated BOOLEAN NOT NULL DEFAULT false,
  card_mesh JSONB NOT NULL DEFAULT '{}'::jsonb,
  button_color TEXT NOT NULL DEFAULT '#0a844a',
  text_color TEXT NOT NULL DEFAULT '#030609',
  logo_url TEXT NOT NULL DEFAULT '',
  logo_min_width INTEGER NOT NULL DEFAULT 250,
  top_image_url TEXT NOT NULL DEFAULT '',
  bottom_image_url TEXT NOT NULL DEFAULT '',
  gradient_from TEXT NOT NULL DEFAULT '#edffef',
  gradient_to TEXT NOT NULL DEFAULT '#0a844a',
  gradient_angle INTEGER NOT NULL DEFAULT 135,
  gradient_animated BOOLEAN NOT NULL DEFAULT false,
  font_family TEXT NOT NULL DEFAULT 'system',
  font_weight INTEGER NOT NULL DEFAULT 700,
  font_size INTEGER NOT NULL DEFAULT 100,
  layout TEXT NOT NULL DEFAULT 'nexora_default',
  watermark BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('person', 'store')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  address_geo_uri TEXT NOT NULL DEFAULT '',
  phones JSONB NOT NULL DEFAULT '[]'::jsonb,
  socials JSONB NOT NULL DEFAULT '{}'::jsonb,
  photo_url TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  hide_logo BOOLEAN NOT NULL DEFAULT false,
  design_id UUID REFERENCES designs(id) ON DELETE SET NULL,
  design_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  vcf_button JSONB NOT NULL DEFAULT '{"enabled":true,"label":"Скачать VCF"}'::jsonb,
  custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS cards_owner_id_idx ON cards(owner_id);
CREATE INDEX IF NOT EXISTS cards_status_idx ON cards(status);
CREATE INDEX IF NOT EXISTS cards_slug_idx ON cards(slug);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  price TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_card_id_idx ON products(card_id);
