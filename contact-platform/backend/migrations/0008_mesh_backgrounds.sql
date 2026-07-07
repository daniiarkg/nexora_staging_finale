ALTER TABLE designs
  ADD COLUMN IF NOT EXISTS background_mesh JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS card_background_type TEXT NOT NULL DEFAULT 'solid',
  ADD COLUMN IF NOT EXISTS card_background_value TEXT NOT NULL DEFAULT '#edffef',
  ADD COLUMN IF NOT EXISTS card_gradient_from TEXT NOT NULL DEFAULT '#edffef',
  ADD COLUMN IF NOT EXISTS card_gradient_to TEXT NOT NULL DEFAULT '#0a844a',
  ADD COLUMN IF NOT EXISTS card_gradient_angle INTEGER NOT NULL DEFAULT 135,
  ADD COLUMN IF NOT EXISTS card_gradient_animated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS card_mesh JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE designs
SET card_background_value = card_color,
    card_gradient_from = card_color,
    card_gradient_to = button_color
WHERE card_background_value = '#edffef'
  AND card_color <> '#edffef';
