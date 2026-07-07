"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, useState } from "react";
import { apiFetch, uploadFile } from "@/lib/api";
import { defaultDesign } from "@/lib/design-presets";
import { designStageBackground } from "@/lib/mesh-gradient";
import type { Design } from "@/lib/types";
import { BackgroundDesigner } from "./BackgroundDesigner";
import { CardPreview, demoCard } from "./CardPreview";

const fontOptions = [
  { value: "system", label: "System" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Mono" },
  { value: "rounded", label: "Rounded" }
] as const;

const blank: Design = {
  name: "",
  ...defaultDesign
};

type DesignImageKey = "logo_url" | "top_image_url" | "bottom_image_url";

function colorValue(value: string | undefined, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value || fallback : fallback;
}

export function DesignEditor({ initial }: { initial?: Design }) {
  const router = useRouter();
  const [design, setDesign] = useState<Design>({ ...blank, ...(initial || {}) });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function patch(next: Partial<Design>) {
    setDesign((current) => ({ ...current, ...next }));
  }

  async function uploadDesignImage(event: ChangeEvent<HTMLInputElement>, key: DesignImageKey) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      const url = await uploadFile(file, key === "logo_url" ? "logo" : "photo");
      patch({ [key]: url } as Partial<Design>);
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
    try {
      const payload = { ...design, layout: "custom" };
      const result = design.id
        ? await apiFetch<{ design: Design }>(`/api/designs/${design.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch<{ design: Design }>("/api/designs", { method: "POST", body: JSON.stringify(payload) });
      if (!design.id) router.replace(`/dashboard/designs/${result.design.id}/edit`);
      setDesign({ ...blank, ...result.design });
    } catch (err) {
      setError(err instanceof Error ? err.message : "save_failed");
    } finally {
      setSaving(false);
    }
  }

  const previewCard = {
    ...demoCard(),
    design,
    vcf_button: { enabled: true, label: "Сохранить контакт" }
  };

  return (
    <main className="editor-layout">
      <section className="editor-form">
        <div className="toolbar">
          <div>
            <p className="eyebrow">Design</p>
            <h1>{design.id ? "Редактирование дизайна" : "Новый дизайн"}</h1>
          </div>
          <button onClick={save} disabled={saving}>Сохранить</button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}

        <fieldset>
          <legend>Основное</legend>
          <label><span>Название</span><input value={design.name} onChange={(e) => patch({ name: e.target.value })} /></label>
          <BackgroundDesigner target="stage" design={design} onPatch={patch} />
        </fieldset>

        <fieldset>
          <legend>Карточка</legend>
          <BackgroundDesigner target="card" design={design} onPatch={patch} />
          <label><span>Цвет кнопок</span><input type="color" value={colorValue(design.button_color, "#0a844a")} onChange={(e) => patch({ button_color: e.target.value })} /></label>
          <label><span>Цвет текста</span><input type="color" value={colorValue(design.text_color, "#030609")} onChange={(e) => patch({ text_color: e.target.value })} /></label>
          <div className="media-logo-preview">
            {design.logo_url ? <img src={design.logo_url} alt="Лого дизайна" /> : <span className="field-note">Лого дизайна не задано</span>}
          </div>
          <label><span>Лого дизайна</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" onChange={(event) => uploadDesignImage(event, "logo_url")} /></label>
          <label><span>Мин. ширина лого дизайна, px</span><input type="number" min="120" max="420" value={design.logo_min_width || 250} onChange={(e) => patch({ logo_min_width: Number(e.target.value) })} /></label>
          <div className="toolbar-actions">
            <button type="button" className="secondary" onClick={() => patch({ logo_url: "" })} disabled={saving || !design.logo_url}>Сбросить лого дизайна</button>
          </div>
          <p className="field-note">Лого дизайна используется только если в профиле карточки не загружено свое лого.</p>
          <div className="media-logo-preview">
            {design.top_image_url ? <img src={design.top_image_url} alt="Верхняя картинка" /> : <span className="field-note">Верхняя картинка не задана</span>}
          </div>
          <label><span>Картинка сверху карточки</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadDesignImage(event, "top_image_url")} /></label>
          <div className="toolbar-actions">
            <button type="button" className="secondary" onClick={() => patch({ top_image_url: "" })} disabled={saving || !design.top_image_url}>Сбросить верхнюю картинку</button>
          </div>
          <div className="media-logo-preview">
            {design.bottom_image_url ? <img src={design.bottom_image_url} alt="Нижняя картинка" /> : <span className="field-note">Нижняя картинка не задана</span>}
          </div>
          <label><span>Картинка снизу карточки</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadDesignImage(event, "bottom_image_url")} /></label>
          <div className="toolbar-actions">
            <button type="button" className="secondary" onClick={() => patch({ bottom_image_url: "" })} disabled={saving || !design.bottom_image_url}>Сбросить нижнюю картинку</button>
          </div>
          <p className="field-note">Картинки будут шириной карточки минус 10px и всегда по центру.</p>
          <label className="checkbox"><input type="checkbox" checked={design.watermark} onChange={(e) => patch({ watermark: e.target.checked })} /> Подложка из отображаемого лого</label>
        </fieldset>

        <fieldset>
          <legend>Типографика</legend>
          <label><span>Шрифт</span><select value={design.font_family} onChange={(e) => patch({ font_family: e.target.value as Design["font_family"] })}>{fontOptions.map((font) => <option value={font.value} key={font.value}>{font.label}</option>)}</select></label>
          <label><span>Вес</span><input type="range" min="400" max="900" step="100" value={design.font_weight || 700} onChange={(e) => patch({ font_weight: Number(e.target.value) })} /></label>
          <label><span>Размер</span><input type="range" min="82" max="122" step="2" value={design.font_size || 100} onChange={(e) => patch({ font_size: Number(e.target.value) })} /></label>
        </fieldset>
      </section>

      <aside className="editor-preview">
        <div className="design-preview-meta" style={{ background: designStageBackground(design) }} />
        <CardPreview card={previewCard} vcfHref="#" />
      </aside>
    </main>
  );
}
