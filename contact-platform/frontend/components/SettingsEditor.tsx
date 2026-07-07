"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { apiFetch, uploadFile } from "@/lib/api";
import type { AppSettings } from "@/lib/types";

export function SettingsEditor() {
  const [settings, setSettings] = useState<AppSettings>({ default_logo_url: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreview, setSelectedPreview] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    apiFetch<{ settings: AppSettings }>("/api/settings")
      .then((data) => setSettings(data.settings))
      .catch((err) => setError(err instanceof Error ? err.message : "settings_failed"));
  }, []);

  useEffect(() => {
    return () => {
      if (selectedPreview.startsWith("blob:")) URL.revokeObjectURL(selectedPreview);
    };
  }, [selectedPreview]);

  async function save(next: AppSettings) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const data = await apiFetch<{ settings: AppSettings }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(next)
      });
      setSettings(data.settings);
      setSuccess("Сохранено");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "settings_failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function selectDefaultLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (selectedPreview.startsWith("blob:")) URL.revokeObjectURL(selectedPreview);
    setSelectedFile(file);
    setSelectedPreview(URL.createObjectURL(file));
    setError("");
    setSuccess("");
  }

  function clearSelection() {
    if (selectedPreview.startsWith("blob:")) URL.revokeObjectURL(selectedPreview);
    setSelectedFile(null);
    setSelectedPreview("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function confirmDefaultLogo() {
    if (!selectedFile) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const url = await uploadFile(selectedFile, "logo");
      const saved = await save({ default_logo_url: url });
      if (saved) clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload_failed");
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaultLogo() {
    clearSelection();
    await save({ default_logo_url: "" });
  }

  const previewURL = selectedPreview || settings.default_logo_url;

  return (
    <main className="dashboard-page">
      <section className="panel panel-wide">
        <div className="toolbar">
          <div>
            <p className="eyebrow">Brand settings</p>
            <h1>Дефолтное лого</h1>
            <p className="section-copy">Глобальное лого больше не подставляется в карточки. Лого отображается только если оно загружено в самой карточке.</p>
          </div>
          <button className="secondary" type="button" onClick={resetDefaultLogo} disabled={saving || (!settings.default_logo_url && !selectedFile)}>Сбросить</button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}
        <div className="settings-grid">
          <div className="brand-preview">
            {previewURL ? <img src={previewURL} alt="Default logo" /> : <span className="field-note">Глобальное лого не задано</span>}
          </div>
          <div className="settings-form">
            <label>
              <span>Загрузить SVG, PNG, JPEG или WEBP</span>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" onChange={selectDefaultLogo} />
            </label>
            {selectedFile ? <p className="selected-file">Выбран файл: {selectedFile.name}</p> : null}
            <div className="toolbar-actions">
              <button type="button" onClick={confirmDefaultLogo} disabled={saving || !selectedFile}>Подтвердить и сохранить</button>
              <button className="secondary" type="button" onClick={clearSelection} disabled={saving || !selectedFile}>Отменить выбор</button>
            </div>
            <label>
              <span>Текущий URL</span>
              <input value={settings.default_logo_url || "Не задано"} readOnly />
            </label>
          </div>
        </div>
      </section>
    </main>
  );
}
