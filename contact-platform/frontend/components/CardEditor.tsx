"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";
import { apiFetch, uploadFile } from "@/lib/api";
import { applyDesignPreset } from "@/lib/design-presets";
import type { AppSettings, Card, CustomField, Product } from "@/lib/types";
import { CardPreview, emptyCard } from "./CardPreview";

type Props = {
  initial?: Card;
};

export function CardEditor({ initial }: Props) {
  const router = useRouter();
  const [card, setCard] = useState<Card>(initial || emptyCard());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ default_logo_url: "" });

  useEffect(() => {
    apiFetch<{ settings: AppSettings }>("/api/settings").then((data) => setSettings(data.settings)).catch(() => undefined);
  }, []);

  function patch(next: Partial<Card>) {
    setCard((current) => ({ ...current, ...next }));
  }

  function patchDesign(key: string, value: string | boolean) {
    setCard((current) => ({ ...current, design: { ...current.design, [key]: value } }));
  }

  function applyPreset(layout: string) {
    setCard((current) => ({ ...current, design: { ...current.design, ...applyDesignPreset(layout) } }));
  }

  function setPhone(index: number, value: string) {
    const phones = [...card.phones];
    phones[index] = value;
    patch({ phones });
  }

  async function upload(event: ChangeEvent<HTMLInputElement>, kind: "logo" | "photo", key: "logo_url" | "photo_url") {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file, kind);
      patch({ [key]: url } as Partial<Card>);
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload_failed");
    }
  }

  async function uploadProductPhoto(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, "product");
    const products = [...card.products];
    products[index] = { ...products[index], photo_url: url };
    patch({ products });
  }

  function updateProduct(index: number, next: Partial<Product>) {
    const products = [...card.products];
    products[index] = { ...products[index], ...next };
    patch({ products });
  }

  function updateField(index: number, next: Partial<CustomField>) {
    const custom_fields = [...card.custom_fields];
    custom_fields[index] = { ...custom_fields[index], ...next };
    patch({ custom_fields });
  }

  async function save(status = card.status) {
    setSaving(true);
    setError("");
    try {
      const payload = { ...card, status };
      const result = card.id
        ? await apiFetch<{ card: Card }>(`/api/cards/${card.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch<{ card: Card }>("/api/cards", { method: "POST", body: JSON.stringify(payload) });
      setCard(result.card);
      if (!card.id) router.replace(`/dashboard/cards/${result.card.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "save_failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="editor-layout">
      <section className="editor-form">
        <div className="toolbar">
          <div>
            <p className="eyebrow">Card editor</p>
            <h1>{card.id ? "Редактирование" : "Создание карточки"}</h1>
          </div>
          <div className="toolbar-actions">
            <button onClick={() => save("draft")} disabled={saving}>Сохранить</button>
            <button onClick={() => save("published")} disabled={saving}>Опубликовать</button>
          </div>
        </div>
        {error ? <p className="form-error">{error}</p> : null}

        <fieldset>
          <legend>Тип и основные данные</legend>
          <label><span>Тип</span><select value={card.type} onChange={(e) => patch({ type: e.target.value as Card["type"] })}><option value="person">Контакт</option><option value="store">Магазин</option></select></label>
          <label><span>{card.type === "store" ? "Название магазина" : "ФИО"}</span><input value={card.name} onChange={(e) => patch({ name: e.target.value })} /></label>
          <label><span>{card.type === "store" ? "Описание" : "Должность"}</span><input value={card.position} onChange={(e) => patch({ position: e.target.value })} /></label>
          <label><span>Компания</span><input value={card.company} onChange={(e) => patch({ company: e.target.value })} /></label>
          <label><span>Slug</span><input value={card.slug} onChange={(e) => patch({ slug: e.target.value })} placeholder="auto" /></label>
        </fieldset>

        <fieldset>
          <legend>Контакты</legend>
          {card.phones.map((phone, index) => (
            <div className="inline-row" key={index}>
              <input value={phone} onChange={(e) => setPhone(index, e.target.value)} placeholder="+996 ..." />
              <button type="button" onClick={() => patch({ phones: card.phones.filter((_, i) => i !== index) })} disabled={card.phones.length === 1}>Удалить</button>
            </div>
          ))}
          <button type="button" onClick={() => patch({ phones: [...card.phones, ""] })}>Добавить номер</button>
          <label><span>Email</span><input value={card.email} onChange={(e) => patch({ email: e.target.value })} /></label>
          <label><span>Website</span><input value={card.website} onChange={(e) => patch({ website: e.target.value })} /></label>
          <label><span>Address</span><input value={card.address} onChange={(e) => patch({ address: e.target.value })} /></label>
        </fieldset>

        <fieldset>
          <legend>Медиа</legend>
          <label><span>Фото</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => upload(e, "photo", "photo_url")} /></label>
          <label><span>Лого</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" onChange={(e) => upload(e, "logo", "logo_url")} /></label>
          <label className="checkbox"><input type="checkbox" checked={card.hide_logo} onChange={(e) => patch({ hide_logo: e.target.checked })} /> Без лого</label>
        </fieldset>

        <fieldset>
          <legend>Дизайн</legend>
          <label><span>Пресет</span><select value={card.design.layout} onChange={(e) => applyPreset(e.target.value)}><option value="nexora_default">Nexora green</option><option value="white">White</option><option value="dark">Dark</option></select></label>
          <label><span>Background type</span><select value={card.design.background_type} onChange={(e) => patchDesign("background_type", e.target.value)}><option value="solid">Цвет</option><option value="gradient">Градиент</option></select></label>
          <label><span>Background</span><input value={card.design.background_value} onChange={(e) => patchDesign("background_value", e.target.value)} placeholder="#edffef or linear-gradient(...)" /></label>
          <label><span>Card color</span><input type="color" value={card.design.card_color} onChange={(e) => patchDesign("card_color", e.target.value)} /></label>
          <label><span>Button color</span><input type="color" value={card.design.button_color} onChange={(e) => patchDesign("button_color", e.target.value)} /></label>
          <label><span>Text color</span><input type="color" value={card.design.text_color} onChange={(e) => patchDesign("text_color", e.target.value)} /></label>
          <label className="checkbox"><input type="checkbox" checked={card.design.watermark} onChange={(e) => patchDesign("watermark", e.target.checked)} /> Watermark из лого</label>
        </fieldset>

        {card.type === "store" ? (
          <fieldset>
            <legend>Каталог товаров</legend>
            {card.products.map((product, index) => (
              <div className="stack-card" key={index}>
                <input value={product.title} onChange={(e) => updateProduct(index, { title: e.target.value })} placeholder="Название товара" />
                <input value={product.price} onChange={(e) => updateProduct(index, { price: e.target.value })} placeholder="Цена" />
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadProductPhoto(index, e)} />
                <button type="button" onClick={() => patch({ products: card.products.filter((_, i) => i !== index) })}>Удалить товар</button>
              </div>
            ))}
            <button type="button" onClick={() => patch({ products: [...card.products, { title: "", price: "" }] })}>Добавить товар</button>
          </fieldset>
        ) : null}

        <fieldset>
          <legend>Кастомные поля</legend>
          {card.custom_fields.map((field, index) => (
            <div className="stack-card" key={index}>
              <input value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} placeholder="Label" />
              <input value={field.value} onChange={(e) => updateField(index, { value: e.target.value })} placeholder="Value" />
              <select value={field.type} onChange={(e) => updateField(index, { type: e.target.value as CustomField["type"] })}><option value="text">Text</option><option value="link">Link</option><option value="phone">Phone</option><option value="email">Email</option></select>
              <button type="button" onClick={() => patch({ custom_fields: card.custom_fields.filter((_, i) => i !== index) })}>Удалить поле</button>
            </div>
          ))}
          <button type="button" onClick={() => patch({ custom_fields: [...card.custom_fields, { label: "", value: "", type: "text" }] })}>Добавить поле</button>
        </fieldset>
      </section>
      <aside className="editor-preview">
        <CardPreview card={card} defaultLogoUrl={settings.default_logo_url} />
      </aside>
    </div>
  );
}
