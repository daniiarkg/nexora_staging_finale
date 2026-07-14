UPDATE designs
SET layout = 'nexora_default',
    updated_at = now()
WHERE owner_id IS NULL
  AND lower(trim(name)) = 'nexora green default';

UPDATE cards
SET design_config = jsonb_set(design_config, '{layout}', '"nexora_default"'::jsonb, true),
    updated_at = now()
WHERE design_id IN (
  SELECT id
  FROM designs
  WHERE owner_id IS NULL
    AND layout = 'nexora_default'
);

UPDATE app_settings
SET value = jsonb_set(value::jsonb, '{design,layout}', '"nexora_default"'::jsonb, true)::text,
    updated_at = now()
WHERE key = 'landing_card'
  AND value <> '';
