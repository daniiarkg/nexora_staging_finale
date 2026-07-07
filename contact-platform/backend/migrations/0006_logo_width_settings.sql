ALTER TABLE designs
  ADD COLUMN IF NOT EXISTS logo_min_width INTEGER NOT NULL DEFAULT 250;

INSERT INTO app_settings (key, value)
VALUES
  ('landing_logo_min_width', '154'),
  ('landing_card_logo_min_width', '250')
ON CONFLICT (key) DO NOTHING;
