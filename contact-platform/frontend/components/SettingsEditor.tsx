"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { apiFetch, uploadFile } from "@/lib/api";
import type { AppSettings } from "@/lib/types";

export function SettingsEditor() {
  const [settings, setSettings] = useState<AppSettings>({ default_logo_url: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ settings: AppSettings }>("/api/settings")
      .then((data) => setSettings(data.settings))
      .catch((err) => setError(err instanceof Error ? err.message : "settings_failed"));
  }, []);

  async function save(next: AppSettings) {
    setSaving(true);
    setError("");
    try {
      const data = await apiFetch<{ settings: AppSettings }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(next)
      });
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "settings_failed");
    } finally {
      setSaving(false);
    }
  }

  async function uploadDefaultLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file, "logo");
      await save({ default_logo_url: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload_failed");
    }
  }

  return (
    <main className="dashboard-page">
      <section className="panel panel-wide">
        <div className="toolbar">
          <div>
            <p className="eyebrow">Brand settings</p>
            <h1>Дефолтное лого</h1>
            <p className="section-copy">Глобальное лого больше не подставляется в карточки. Лого отображается только если оно загружено в самой карточке.</p>
          </div>
          <button className="secondary" type="button" onClick={() => save({ default_logo_url: "" })} disabled={saving || !settings.default_logo_url}>Сбросить</button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="settings-grid">
          <div className="brand-preview">
            {settings.default_logo_url ? <img src={settings.default_logo_url} alt="Default logo" /> : <span className="field-note">Глобальное лого не задано</span>}
          </div>
          <div className="settings-form">
            <label>
              <span>Загрузить SVG, PNG, JPEG или WEBP</span>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" onChange={uploadDefaultLogo} />
            </label>
            <label>
              <span>Текущий URL</span>
              <input value={settings.default_logo_url} readOnly />
            </label>
          </div>
        </div>
      </section>
    </main>
  );
}
