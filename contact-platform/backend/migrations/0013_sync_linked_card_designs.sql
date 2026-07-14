UPDATE cards
SET design_config = synced.config,
    updated_at = now()
FROM (
  SELECT id,
         to_jsonb(designs) - ARRAY['id', 'owner_id', 'name', 'created_at', 'updated_at'] AS config
  FROM designs
) AS synced
WHERE cards.design_id = synced.id;

UPDATE app_settings
SET value = jsonb_set(value::jsonb, '{design}', synced.config, true)::text,
    updated_at = now()
FROM (
  SELECT to_jsonb(designs) - ARRAY['id', 'owner_id', 'name', 'created_at', 'updated_at'] AS config
  FROM designs
  WHERE layout = 'nexora_default'
  ORDER BY updated_at DESC
  LIMIT 1
) AS synced
WHERE key = 'landing_card'
  AND value <> '';
