ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS name_translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS position_translations JSONB NOT NULL DEFAULT '{}'::jsonb;
