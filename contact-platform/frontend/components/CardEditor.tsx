"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";
import { apiFetch, uploadFile } from "@/lib/api";
import type { Card, CustomField, Design, DesignConfig, Product } from "@/lib/types";
import { CardPreview, emptyCard } from "./CardPreview";

type Props = {
  initial?: Card;
};

function withCardDefaults(initial?: Card): Card {
  const base = emptyCard();
  if (!initial) return base;
  return {
    ...base,
    ...initial,
    design: { ...base.design, ...(initial.design || {}) },
    vcf_button: { ...base.vcf_button, ...(initial.vcf_button || {}) },
    phones: initial.phones?.length ? initial.phones : base.phones,
    custom_fields: initial.custom_fields || [],
    products: initial.products || []
  };
}

export function CardEditor({ initial }: Props) {
  const router = useRouter();
  const [card, setCard] = useState<Card>(() => withCardDefaults(initial));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [selectedDesignId, setSelectedDesignId] = useState(initial?.design_id || "");

  useEffect(() => {
    apiFetch<{ designs: Design[] }>("/api/designs").then((data) => {
      setDesigns(data.designs);
      if (!selectedDesignId && data.designs[0]?.id) setSelectedDesignId(data.designs[0].id);
    }).catch(() => setDesigns([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patch(next: Partial<Card>) {
    setCard((current) => ({ ...current, ...next }));
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

  function designConfigFrom(design: Design): DesignConfig {
    return {
      background_type: design.background_type,
      background_value: design.background_value,
      background_mesh: design.background_mesh,
      card_background_type: design.card_background_type,
      card_background_value: design.card_background_value,
      card_color: design.card_color,
      card_gradient_from: design.card_gradient_from,
      card_gradient_to: design.card_gradient_to,
      card_gradient_angle: design.card_gradient_angle,
      card_gradient_animated: design.card_gradient_animated,
      card_gradient_animation_speed: design.card_gradient_animation_speed,
      card_mesh: design.card_mesh,
      button_color: design.button_color,
      text_color: design.text_color,
      logo_url: design.logo_url,
      logo_min_width: design.logo_min_width,
      top_image_url: design.top_image_url,
      bottom_image_url: design.bottom_image_url,
      gradient_from: design.gradient_from,
      gradient_to: design.gradient_to,
      gradient_angle: design.gradient_angle,
      gradient_animated: design.gradient_animated,
      gradient_animation_speed: design.gradient_animation_speed,
      font_family: design.font_family,
      font_weight: design.font_weight,
      font_size: design.font_size,
      layout: design.layout,
      watermark: design.watermark
    };
  }

  function importDesign() {
    const design = designs.find((item) => item.id === selectedDesignId);
    if (!design) return;
    patch({ design_id: design.id, design: designConfigFrom(design) });
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
          <label><span>Адрес для отображения</span><input value={card.address} onChange={(e) => patch({ address: e.target.value })} placeholder="Бишкек, ул. ..." /></label>
          <label><span>2ГИС ссылка или geo URI</span><input value={card.address_geo_uri} onChange={(e) => patch({ address_geo_uri: e.target.value })} placeholder="https://2gis.kg/... или geo:42.8746,74.5698" /></label>
        </fieldset>

        <fieldset>
          <legend>Медиа</legend>
          <label><span>Фото</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => upload(e, "photo", "photo_url")} /></label>
          <div className="media-logo-preview">
            {card.logo_url ? <img src={card.logo_url} alt="Лого профиля" /> : card.design.logo_url ? <img src={card.design.logo_url} alt="Лого дизайна" /> : <span className="field-note">Лого не задано</span>}
          </div>
          <label><span>Лого профиля</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" onChange={(e) => upload(e, "logo", "logo_url")} /></label>
          <div className="toolbar-actions">
            <button type="button" className="secondary" onClick={() => patch({ logo_url: "" })} disabled={saving || !card.logo_url}>Сбросить лого профиля</button>
          </div>
          <p className="field-note">Лого профиля в приоритете. Если оно не задано, карточка возьмет лого из импортированного дизайна.</p>
          <label className="checkbox"><input type="checkbox" checked={card.hide_logo} onChange={(e) => patch({ hide_logo: e.target.checked })} /> Без лого</label>
        </fieldset>

        <fieldset>
          <legend>Дизайн</legend>
          {designs.length ? (
            <>
              <label><span>Импортировать дизайн</span><select value={selectedDesignId} onChange={(e) => setSelectedDesignId(e.target.value)}>{designs.map((design) => <option value={design.id} key={design.id}>{design.name}</option>)}</select></label>
              <button type="button" className="secondary" onClick={importDesign}>Импортировать в карточку</button>
              <p className="field-note">Цвета, фон, шрифт и анимация редактируются только в разделе «Дизайны».</p>
            </>
          ) : (
            <p className="field-note">Создайте дизайн в разделе «Дизайны», затем импортируйте его в карточку.</p>
          )}
        </fieldset>

        <fieldset>
          <legend>VCF-кнопка</legend>
          <label className="checkbox"><input type="checkbox" checked={card.vcf_button.enabled} onChange={(e) => patch({ vcf_button: { ...card.vcf_button, enabled: e.target.checked } })} /> Показывать кнопку VCF</label>
          <label><span>Текст кнопки</span><input value={card.vcf_button.label} onChange={(e) => patch({ vcf_button: { ...card.vcf_button, label: e.target.value } })} /></label>
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
        <CardPreview card={card} vcfHref="#" />
      </aside>
    </div>
  );
}
