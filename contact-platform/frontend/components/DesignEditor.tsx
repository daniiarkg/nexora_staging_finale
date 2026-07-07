"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { defaultDesign } from "@/lib/design-presets";
import type { Design } from "@/lib/types";
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

function colorValue(value: string | undefined, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value || fallback : fallback;
}

function designBackground(design: Design) {
  if (design.background_type === "gradient") {
    return `linear-gradient(${design.gradient_angle || 135}deg, ${design.gradient_from || design.background_value}, ${design.gradient_to || design.button_color})`;
  }
  return design.background_value || "#edffef";
}

export function DesignEditor({ initial }: { initial?: Design }) {
  const router = useRouter();
  const [design, setDesign] = useState<Design>({ ...blank, ...(initial || {}) });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function patch(next: Partial<Design>) {
    setDesign((current) => ({ ...current, ...next }));
  }

  function setBackgroundType(background_type: Design["background_type"]) {
    setDesign((current) => {
      if (background_type === "gradient") {
        return {
          ...current,
          background_type,
          gradient_from: current.gradient_from || current.background_value || "#edffef",
          gradient_to: current.gradient_to || current.button_color || "#0a844a"
        };
      }
      return { ...current, background_type, gradient_animated: false };
    });
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
          <label><span>Тип фона</span><select value={design.background_type} onChange={(e) => setBackgroundType(e.target.value as Design["background_type"])}><option value="solid">Цвет</option><option value="gradient">Градиент</option></select></label>
          {design.background_type === "solid" ? (
            <label><span>Цвет фона</span><input type="color" value={colorValue(design.background_value, "#edffef")} onChange={(e) => patch({ background_value: e.target.value })} /></label>
          ) : (
            <div className="control-grid">
              <label><span>Цвет 1</span><input type="color" value={colorValue(design.gradient_from, "#edffef")} onChange={(e) => patch({ gradient_from: e.target.value })} /></label>
              <label><span>Цвет 2</span><input type="color" value={colorValue(design.gradient_to, "#0a844a")} onChange={(e) => patch({ gradient_to: e.target.value })} /></label>
              <label><span>Угол</span><input type="number" min="0" max="360" value={design.gradient_angle || 135} onChange={(e) => patch({ gradient_angle: Number(e.target.value) })} /></label>
              <label className="checkbox"><input type="checkbox" checked={design.gradient_animated} onChange={(e) => patch({ gradient_animated: e.target.checked })} /> Анимировать градиент</label>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Карточка</legend>
          <label><span>Цвет карточки</span><input type="color" value={colorValue(design.card_color, "#edffef")} onChange={(e) => patch({ card_color: e.target.value })} /></label>
          <label><span>Цвет кнопок</span><input type="color" value={colorValue(design.button_color, "#0a844a")} onChange={(e) => patch({ button_color: e.target.value })} /></label>
          <label><span>Цвет текста</span><input type="color" value={colorValue(design.text_color, "#030609")} onChange={(e) => patch({ text_color: e.target.value })} /></label>
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
        <div className="design-preview-meta" style={{ background: designBackground(design) }} />
        <CardPreview card={previewCard} vcfHref="#" />
      </aside>
    </main>
  );
}
