ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS address_geo_uri TEXT NOT NULL DEFAULT '';

INSERT INTO app_settings (key, value)
VALUES
  ('favicon_url', '/nexora-text-logo.svg'),
  ('landing_logo_url', '/nexora-text-logo.svg'),
  ('landing_eyebrow', 'Nexora Contacts'),
  ('landing_title', 'Контактные карточки и мини-витрины без лишней возни.'),
  ('landing_lead', 'Публичные ссылки, VCF, несколько телефонов, товары, кастомный дизайн и предпросмотр в одном аккуратном рабочем интерфейсе.'),
  ('landing_primary_label', 'Войти'),
  ('landing_primary_href', '/login'),
  ('landing_secondary_label', 'Регистрация'),
  ('landing_secondary_href', '/register'),
  ('landing_features', '["Person cards","Store catalog","VCF export"]'),
  ('landing_card', '{"slug":"demo","type":"person","status":"published","name":"Айбек Осмонов","position":"AI Operations Consultant","company":"Nexora Group","email":"demo@nexora.kg","website":"https://nexora.kg","address":"Бишкек","address_geo_uri":"geo:42.8746,74.5698","phones":["+996 555 123 456"],"socials":{"telegram":"https://t.me/nexora"},"photo_url":"","logo_url":"","hide_logo":false,"design":{"background_type":"solid","background_value":"#edffef","card_color":"#edffef","button_color":"#0a844a","text_color":"#030609","logo_url":"/nexora-text-logo.svg","gradient_from":"#edffef","gradient_to":"#0a844a","gradient_angle":135,"gradient_animated":false,"font_family":"system","font_weight":700,"font_size":100,"layout":"custom","watermark":true},"vcf_button":{"enabled":true,"label":"Сохранить контакт"},"custom_fields":[{"label":"Office","value":"Mon-Fri, 10:00-18:00","type":"text"}],"products":[]}')
ON CONFLICT (key) DO NOTHING;
