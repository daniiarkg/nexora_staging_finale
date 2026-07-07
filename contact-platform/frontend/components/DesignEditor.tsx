"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { applyDesignPreset } from "@/lib/design-presets";
import type { Design } from "@/lib/types";

const blank: Design = {
  name: "",
  ...applyDesignPreset("nexora_default")
};

export function DesignEditor({ initial }: { initial?: Design }) {
  const router = useRouter();
  const [design, setDesign] = useState<Design>(initial || blank);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function patch(next: Partial<Design>) {
    setDesign((current) => ({ ...current, ...next }));
  }

  function applyPreset(layout: string) {
    setDesign((current) => ({ ...current, ...applyDesignPreset(layout) }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const result = design.id
        ? await apiFetch<{ design: Design }>(`/api/designs/${design.id}`, { method: "PATCH", body: JSON.stringify(design) })
        : await apiFetch<{ design: Design }>("/api/designs", { method: "POST", body: JSON.stringify(design) });
      if (!design.id) router.replace(`/dashboard/designs/${result.design.id}/edit`);
      setDesign(result.design);
    } catch (err) {
      setError(err instanceof Error ? err.message : "save_failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="editor-layout">
      <section className="editor-form">
        <div className="toolbar">
          <h1>{design.id ? "Редактирование дизайна" : "Новый дизайн"}</h1>
          <button onClick={save} disabled={saving}>Сохранить</button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <fieldset>
          <legend>Design</legend>
          <label><span>Название</span><input value={design.name} onChange={(e) => patch({ name: e.target.value })} /></label>
          <label><span>Layout</span><select value={design.layout} onChange={(e) => applyPreset(e.target.value)}><option value="nexora_default">Nexora green</option><option value="white">White</option><option value="dark">Dark</option></select></label>
          <label><span>Background type</span><select value={design.background_type} onChange={(e) => patch({ background_type: e.target.value as Design["background_type"] })}><option value="solid">Solid</option><option value="gradient">Gradient</option></select></label>
          <label><span>Background value</span><input value={design.background_value} onChange={(e) => patch({ background_value: e.target.value })} /></label>
          <label><span>Card color</span><input type="color" value={design.card_color} onChange={(e) => patch({ card_color: e.target.value })} /></label>
          <label><span>Button color</span><input type="color" value={design.button_color} onChange={(e) => patch({ button_color: e.target.value })} /></label>
          <label><span>Text color</span><input type="color" value={design.text_color} onChange={(e) => patch({ text_color: e.target.value })} /></label>
          <label className="checkbox"><input type="checkbox" checked={design.watermark} onChange={(e) => patch({ watermark: e.target.checked })} /> Watermark</label>
        </fieldset>
      </section>
      <aside className="editor-preview">
        <div className="preview-stage" style={{ background: design.background_value }}>
          <div className="preview-card" style={{ background: design.card_color, color: design.text_color }}>
            <p className="eyebrow">Preview</p>
            <h1>{design.name || "Design"}</h1>
            <div className="preview-actions"><a style={{ borderColor: design.button_color }}><span>Button</span><b>Example action</b></a></div>
          </div>
        </div>
      </aside>
    </main>
  );
}
