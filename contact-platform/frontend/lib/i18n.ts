import type { LanguageCode, TranslationCopy, TranslationDictionary, TranslationKey } from "./types";

export const languages: { code: LanguageCode; label: string; nativeLabel: string }[] = [
  { code: "ru", label: "Русский", nativeLabel: "Русский" },
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "ky", label: "Кыргызский", nativeLabel: "Кыргызча" }
];

export const translationFields: { key: TranslationKey; label: string }[] = [
  { key: "language_menu_label", label: "Кнопка выбора языка" },
  { key: "language_ru", label: "Название русского языка" },
  { key: "language_en", label: "Название английского языка" },
  { key: "language_ky", label: "Название кыргызского языка" },
  { key: "phone_label", label: "Поле телефона" },
  { key: "email_label", label: "Поле email" },
  { key: "website_label", label: "Поле сайта" },
  { key: "address_label", label: "Поле адреса" },
  { key: "open_map_label", label: "Текст открытия карты" },
  { key: "vcf_save_label", label: "Кнопка VCF по умолчанию" },
  { key: "person_name_placeholder", label: "Плейсхолдер имени" },
  { key: "store_name_placeholder", label: "Плейсхолдер магазина" },
  { key: "product_placeholder", label: "Плейсхолдер товара" }
];

export const defaultTranslations: TranslationDictionary = {
  ru: {
    language_menu_label: "Выбрать язык",
    language_ru: "Русский",
    language_en: "English",
    language_ky: "Кыргызча",
    phone_label: "Телефон",
    email_label: "Email",
    website_label: "Сайт",
    address_label: "Адрес",
    open_map_label: "Открыть в карте",
    vcf_save_label: "Сохранить контакт",
    person_name_placeholder: "Имя Фамилия",
    store_name_placeholder: "Название магазина",
    product_placeholder: "Товар"
  },
  en: {
    language_menu_label: "Choose language",
    language_ru: "Russian",
    language_en: "English",
    language_ky: "Kyrgyz",
    phone_label: "Phone",
    email_label: "Email",
    website_label: "Website",
    address_label: "Address",
    open_map_label: "Open in map",
    vcf_save_label: "Save contact",
    person_name_placeholder: "Full name",
    store_name_placeholder: "Store name",
    product_placeholder: "Product"
  },
  ky: {
    language_menu_label: "Тилди тандоо",
    language_ru: "Орусча",
    language_en: "Англисче",
    language_ky: "Кыргызча",
    phone_label: "Телефон",
    email_label: "Email",
    website_label: "Сайт",
    address_label: "Дарек",
    open_map_label: "Картадан ачуу",
    vcf_save_label: "Байланышты сактоо",
    person_name_placeholder: "Аты-жөнү",
    store_name_placeholder: "Дүкөндүн аталышы",
    product_placeholder: "Товар"
  }
};

const defaultVCFLabels = new Set([
  "Скачать VCF",
  "Сохранить контакт",
  "Save contact",
  "Байланышты сактоо"
]);

export function normalizeLanguage(value?: string): LanguageCode {
  return languages.some((language) => language.code === value) ? (value as LanguageCode) : "ru";
}

export function normalizeTranslations(settings?: Partial<TranslationDictionary>): TranslationDictionary {
  const next = cloneTranslations(defaultTranslations);
  if (!settings) return next;
  for (const language of languages) {
    const source = settings[language.code];
    if (!source) continue;
    for (const field of translationFields) {
      const value = source[field.key]?.trim();
      if (value) next[language.code][field.key] = value;
    }
  }
  return next;
}

export function copyForLanguage(translations: Partial<TranslationDictionary> | undefined, language: string): TranslationCopy {
  const normalized = normalizeTranslations(translations);
  return normalized[normalizeLanguage(language)];
}

export function vcfLabelFor(value: string | undefined, copy: TranslationCopy) {
  const label = (value || "").trim();
  if (!label || defaultVCFLabels.has(label)) return copy.vcf_save_label;
  return label;
}

function cloneTranslations(source: TranslationDictionary): TranslationDictionary {
  return {
    ru: { ...source.ru },
    en: { ...source.en },
    ky: { ...source.ky }
  };
}
