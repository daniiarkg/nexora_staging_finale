ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'ru';

INSERT INTO app_settings (key, value)
VALUES (
  'translations',
  '{
    "ru":{
      "language_menu_label":"Выбрать язык",
      "language_ru":"Русский",
      "language_en":"English",
      "language_ky":"Кыргызча",
      "phone_label":"Телефон",
      "email_label":"Email",
      "website_label":"Сайт",
      "address_label":"Адрес",
      "open_map_label":"Открыть в карте",
      "vcf_save_label":"Сохранить контакт",
      "person_name_placeholder":"Имя Фамилия",
      "store_name_placeholder":"Название магазина",
      "product_placeholder":"Товар"
    },
    "en":{
      "language_menu_label":"Choose language",
      "language_ru":"Russian",
      "language_en":"English",
      "language_ky":"Kyrgyz",
      "phone_label":"Phone",
      "email_label":"Email",
      "website_label":"Website",
      "address_label":"Address",
      "open_map_label":"Open in map",
      "vcf_save_label":"Save contact",
      "person_name_placeholder":"Full name",
      "store_name_placeholder":"Store name",
      "product_placeholder":"Product"
    },
    "ky":{
      "language_menu_label":"Тилди тандоо",
      "language_ru":"Орусча",
      "language_en":"Англисче",
      "language_ky":"Кыргызча",
      "phone_label":"Телефон",
      "email_label":"Email",
      "website_label":"Сайт",
      "address_label":"Дарек",
      "open_map_label":"Картадан ачуу",
      "vcf_save_label":"Байланышты сактоо",
      "person_name_placeholder":"Аты-жөнү",
      "store_name_placeholder":"Дүкөндүн аталышы",
      "product_placeholder":"Товар"
    }
  }'
)
ON CONFLICT (key) DO NOTHING;
