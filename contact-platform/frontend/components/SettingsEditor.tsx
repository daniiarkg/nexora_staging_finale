"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { apiFetch, uploadFile } from "@/lib/api";
import { languages, translationFields } from "@/lib/i18n";
import { defaultSettings, withSettingsDefaults } from "@/lib/settings";
import type { AppSettings, Card, LanguageCode, TranslationKey } from "@/lib/types";
import { CardPreview } from "./CardPreview";

type AssetKey = "favicon_url" | "landing_logo_url";

export function SettingsEditor() {
  const [settings, setSettings] = useState<AppSettings>(() => defaultSettings());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState<LanguageCode>("ru");

  useEffect(() => {
    apiFetch<{ settings: AppSettings }>("/api/settings")
      .then((data) => setSettings(withSettingsDefaults(data.settings)))
      .catch((err) => setError(err instanceof Error ? err.message : "settings_failed"));
  }, []);

  function patch(next: Partial<AppSettings>) {
    setSettings((current) => withSettingsDefaults({ ...current, ...next }));
    setSuccess("");
  }

  function patchLandingCard(next: Partial<Card>) {
    setSettings((current) => withSettingsDefaults({ ...current, landing_card: { ...current.landing_card, ...next } }));
    setSuccess("");
  }

  function patchFeature(index: number, value: string) {
    const features = [...settings.landing_features];
    features[index] = value;
    patch({ landing_features: features });
  }

  function patchPhone(index: number, value: string) {
    const phones = [...settings.landing_card.phones];
    phones[index] = value;
    patchLandingCard({ phones });
  }

  function patchLandingLocalizedText(key: "name_translations" | "position_translations", language: LanguageCode, value: string) {
    patchLandingCard({
      [key]: {
        ...(settings.landing_card[key] || {}),
        [language]: value
      }
    } as Partial<Card>);
  }

  function patchTranslation(language: LanguageCode, key: TranslationKey, value: string) {
    patch({
      translations: {
        ...settings.translations,
        [language]: {
          ...settings.translations[language],
          [key]: value
        }
      }
    });
  }

  async function uploadAsset(event: ChangeEvent<HTMLInputElement>, key: AssetKey) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const url = await uploadFile(file, "logo");
      patch({ [key]: url } as Partial<AppSettings>);
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload_failed");
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const data = await apiFetch<{ settings: AppSettings }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(settings)
      });
      setSettings(withSettingsDefaults(data.settings));
      setSuccess("Сохранено");
    } catch (err) {
      setError(err instanceof Error ? err.message : "settings_failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="dashboard-page">
      <section className="panel panel-wide">
        <div className="toolbar">
          <div>
            <p className="eyebrow">Landing CMS</p>
            <h1>Настройки сайта</h1>
            <p className="section-copy">Иконка вкладки, лого лендинга, hero-контент и тестовая карточка на главной.</p>
          </div>
          <button type="button" onClick={save} disabled={saving}>Сохранить настройки</button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        <div className="settings-grid">
          <div className="settings-form">
            <fieldset>
              <legend>Медиа</legend>
              <div className="media-logo-preview">
                {settings.favicon_url ? <img src={settings.favicon_url} alt="Favicon" /> : <span className="field-note">Иконка не задана</span>}
              </div>
              <label><span>Иконка адресной строки</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" onChange={(event) => uploadAsset(event, "favicon_url")} /></label>
              <input value={settings.favicon_url} onChange={(event) => patch({ favicon_url: event.target.value })} placeholder="/uploads/logo.svg" />

              <div className="media-logo-preview">
                {settings.landing_logo_url ? <img src={settings.landing_logo_url} alt="Лого лендинга" /> : <span className="field-note">Лого лендинга не задано</span>}
              </div>
              <label><span>Лого в лендинге</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" onChange={(event) => uploadAsset(event, "landing_logo_url")} /></label>
              <input value={settings.landing_logo_url} onChange={(event) => patch({ landing_logo_url: event.target.value })} placeholder="/uploads/logo.svg" />
              <div className="control-grid">
                <label><span>Мин. ширина лого в navbar, px</span><input type="number" min="80" max="420" value={settings.landing_logo_min_width} onChange={(event) => patch({ landing_logo_min_width: Number(event.target.value) })} /></label>
                <label><span>Мин. ширина лого в карточке, px</span><input type="number" min="120" max="420" value={settings.landing_card_logo_min_width} onChange={(event) => patch({ landing_card_logo_min_width: Number(event.target.value) })} /></label>
              </div>
              <p className="field-note">Карточка на лендинге наследует это лого как лого дизайна. Лого профиля карточки все еще имеет приоритет.</p>
            </fieldset>

            <fieldset>
              <legend>Hero-контент</legend>
              <label><span>Eyebrow</span><input value={settings.landing_eyebrow} onChange={(event) => patch({ landing_eyebrow: event.target.value })} /></label>
              <label><span>Заголовок</span><textarea value={settings.landing_title} onChange={(event) => patch({ landing_title: event.target.value })} /></label>
              <label><span>Описание</span><textarea value={settings.landing_lead} onChange={(event) => patch({ landing_lead: event.target.value })} /></label>
              <div className="control-grid">
                <label><span>Основная кнопка</span><input value={settings.landing_primary_label} onChange={(event) => patch({ landing_primary_label: event.target.value })} /></label>
                <label><span>Ссылка</span><input value={settings.landing_primary_href} onChange={(event) => patch({ landing_primary_href: event.target.value })} /></label>
                <label><span>Вторая кнопка</span><input value={settings.landing_secondary_label} onChange={(event) => patch({ landing_secondary_label: event.target.value })} /></label>
                <label><span>Ссылка</span><input value={settings.landing_secondary_href} onChange={(event) => patch({ landing_secondary_href: event.target.value })} /></label>
              </div>
              {settings.landing_features.map((feature, index) => (
                <label key={index}><span>Feature {index + 1}</span><input value={feature} onChange={(event) => patchFeature(index, event.target.value)} /></label>
              ))}
            </fieldset>

            <fieldset>
              <legend>Мультиязычность карточки</legend>
              <div className="segmented-control">
                {languages.map((language) => (
                  <button
                    type="button"
                    key={language.code}
                    className={translationLanguage === language.code ? "is-active" : ""}
                    onClick={() => setTranslationLanguage(language.code)}
                  >
                    {language.nativeLabel}
                  </button>
                ))}
              </div>
              <p className="field-note">Эти строки управляют подписями публичной карточки и меню языка. Их можно править вручную, если перевод нужно скорректировать.</p>
              {translationFields.map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  <input
                    value={settings.translations[translationLanguage][field.key]}
                    onChange={(event) => patchTranslation(translationLanguage, field.key, event.target.value)}
                  />
                </label>
              ))}
            </fieldset>

            <fieldset>
              <legend>Карточка на лендинге</legend>
              <label><span>Основной язык карточки</span><select value={settings.landing_card.preferred_language} onChange={(event) => patchLandingCard({ preferred_language: event.target.value as Card["preferred_language"] })}>{languages.map((language) => <option value={language.code} key={language.code}>{language.label}</option>)}</select></label>
              <label><span>Тип</span><select value={settings.landing_card.type} onChange={(event) => patchLandingCard({ type: event.target.value as Card["type"] })}><option value="person">Контакт</option><option value="store">Магазин</option></select></label>
              <label><span>Имя / название</span><input value={settings.landing_card.name} onChange={(event) => patchLandingCard({ name: event.target.value })} /></label>
              <label><span>Должность / описание</span><input value={settings.landing_card.position} onChange={(event) => patchLandingCard({ position: event.target.value })} /></label>
              {languages.map((language) => (
                <div className="stack-card" key={language.code}>
                  <label><span>Имя / {language.label}</span><input value={settings.landing_card.name_translations?.[language.code] || ""} onChange={(event) => patchLandingLocalizedText("name_translations", language.code, event.target.value)} /></label>
                  <label><span>Должность / {language.label}</span><input value={settings.landing_card.position_translations?.[language.code] || ""} onChange={(event) => patchLandingLocalizedText("position_translations", language.code, event.target.value)} /></label>
                </div>
              ))}
              <label><span>Компания</span><input value={settings.landing_card.company} onChange={(event) => patchLandingCard({ company: event.target.value })} /></label>
              {settings.landing_card.phones.map((phone, index) => (
                <div className="inline-row" key={index}>
                  <input value={phone} onChange={(event) => patchPhone(index, event.target.value)} placeholder="+996 ..." />
                  <button type="button" onClick={() => patchLandingCard({ phones: settings.landing_card.phones.filter((_, itemIndex) => itemIndex !== index) })} disabled={settings.landing_card.phones.length === 1}>Удалить</button>
                </div>
              ))}
              <button type="button" className="secondary" onClick={() => patchLandingCard({ phones: [...settings.landing_card.phones, ""] })}>Добавить номер</button>
              <label><span>Email</span><input value={settings.landing_card.email} onChange={(event) => patchLandingCard({ email: event.target.value })} /></label>
              <label><span>Website</span><input value={settings.landing_card.website} onChange={(event) => patchLandingCard({ website: event.target.value })} /></label>
              <label><span>Адрес для отображения</span><input value={settings.landing_card.address} onChange={(event) => patchLandingCard({ address: event.target.value })} /></label>
              <label><span>2ГИС ссылка или geo URI</span><input value={settings.landing_card.address_geo_uri} onChange={(event) => patchLandingCard({ address_geo_uri: event.target.value })} placeholder="https://2gis.kg/... или geo:42.8746,74.5698" /></label>
              <div className="control-grid">
                <label><span>Instagram</span><input value={settings.landing_card.socials.instagram || ""} onChange={(event) => patchLandingCard({ socials: { ...settings.landing_card.socials, instagram: event.target.value } })} /></label>
                <label><span>WhatsApp</span><input value={settings.landing_card.socials.whatsapp || ""} onChange={(event) => patchLandingCard({ socials: { ...settings.landing_card.socials, whatsapp: event.target.value } })} /></label>
                <label><span>Telegram</span><input value={settings.landing_card.socials.telegram || ""} onChange={(event) => patchLandingCard({ socials: { ...settings.landing_card.socials, telegram: event.target.value } })} /></label>
              </div>
              <label><span>Текст VCF-кнопки</span><input value={settings.landing_card.vcf_button.label} onChange={(event) => patchLandingCard({ vcf_button: { ...settings.landing_card.vcf_button, label: event.target.value } })} /></label>
            </fieldset>
          </div>

          <aside className="editor-preview settings-preview">
            <CardPreview card={settings.landing_card} vcfHref="#" translations={settings.translations} />
          </aside>
        </div>
      </section>
    </main>
  );
}
