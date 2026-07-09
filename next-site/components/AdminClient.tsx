"use client";

import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { ButtonLink, CardItem, CmsPayload, CourseContent, LeadFormText, PageContent, PageSection, SiteContent, UiLabels } from "@/lib/types";

type AdminTab = "settings" | "pages" | "courses" | "assets" | "lottie";

const uiLabels: UiLabels = {
  coursesGridEyebrow: "программы",
  courseDetailsButton: "Подробнее",
  courseEnrollButton: "Записаться",
  courseDetailEyebrow: "курс",
  courseProgramEyebrow: "программа",
  courseProgramTitle: "Что изучаем",
  courseResultsEyebrow: "результат",
  courseResultsTitle: "После курса",
  courseLeadEyebrow: "запись",
  allCoursesLabel: "Все курсы"
};

const formLabels: LeadFormText = {
  nameLabel: "Имя",
  emailLabel: "Email",
  phoneLabel: "Телефон",
  pendingStatus: "Отправляем...",
  successStatus: "Заявка отправлена.",
  fallbackStatus: "Открываем страницу отправки...",
  messageIntro: "Новая заявка на сайте Nexora.",
  interestFallback: "не указано",
  subjectPrefix: "Новая заявка Nexora",
  fromName: "Nexora"
};

const emptyPayload: CmsPayload = {
  content: {
    settings: {
      brandLogo: "",
      brandLogoDark: "",
      footerLogo: "",
      footerLogoDark: "",
      web3formsAccessKey: "",
      footerText: "",
      ui: uiLabels,
      form: formLabels,
      nav: []
    },
    pages: {},
    courses: []
  },
  lottieJsonText: "{}"
};

const pageNames: Record<string, string> = {
  home: "Главная",
  courses: "Курсы",
  consulting: "AI-консалтинг",
  nfc: "NFC-карты",
  documents: "AI-документы"
};

const sectionNames: Record<PageSection["type"], string> = {
  cards: "Карточки продуктов",
  services: "Карточки услуг",
  timeline: "Этапы",
  metrics: "Метрики",
  benefits: "Преимущества",
  mock: "Мокап NFC",
  documents: "Документы"
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function statusClass(status: string) {
  if (status.includes("Сохранено") || status.includes("Готово") || status.includes("загружена")) return "success";
  if (status.includes("Невер") || status.includes("ошиб") || status.includes("Не удалось") || status.includes("не похож") || status.includes("слишком")) return "error";
  return "";
}

function TextField({
  label,
  value,
  onChange,
  multiline,
  rows = 3,
  placeholder
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="cms-field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value || ""} rows={rows} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value || ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function AssetField({
  label,
  value,
  onChange,
  uploadFile,
  note = "SVG, PNG, JPG, WEBP, GIF или ICO до 3 MB."
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  uploadFile: (file: File) => Promise<string>;
  note?: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    setUploading(true);
    try {
      const url = await uploadFile(selected);
      onChange(url);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="cms-asset-field">
      <div className="cms-asset-preview">
        {value ? <img src={value} alt="" /> : <span>Нет файла</span>}
      </div>
      <div className="cms-asset-body">
        <label className="upload-control">
          <span>{label}</span>
          <input type="file" accept=".svg,.png,.jpg,.jpeg,.webp,.gif,.ico,image/svg+xml,image/png,image/jpeg,image/webp,image/gif,image/x-icon" onChange={upload} disabled={uploading} />
          <small>{uploading ? "Загружаем..." : note}</small>
        </label>
        {value ? <code className="asset-url">{value}</code> : null}
      </div>
    </div>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="cms-panel">
      <div className="cms-panel-heading">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StringListEditor({ title, items, onChange }: { title: string; items: string[]; onChange: (items: string[]) => void }) {
  return (
    <div className="cms-list-editor">
      <div className="cms-list-heading">
        <h3>{title}</h3>
        <button className="ghost-button compact" type="button" onClick={() => onChange([...items, ""])}>
          Добавить
        </button>
      </div>
      <div className="cms-list-rows">
        {items.map((item, index) => (
          <div className="cms-list-row" key={index}>
            <TextField
              label={`Пункт ${index + 1}`}
              value={item}
              onChange={(value) => onChange(items.map((current, currentIndex) => (currentIndex === index ? value : current)))}
            />
            <button className="ghost-button compact danger" type="button" onClick={() => onChange(items.filter((_, currentIndex) => currentIndex !== index))}>
              Удалить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ButtonEditor({ title, value, onChange }: { title: string; value: ButtonLink; onChange: (value: ButtonLink) => void }) {
  return (
    <div className="cms-mini-card">
      <h3>{title}</h3>
      <div className="cms-field-grid two">
        <TextField label="Текст кнопки" value={value.label} onChange={(label) => onChange({ ...value, label })} />
        <TextField label="Ссылка" value={value.href} onChange={(href) => onChange({ ...value, href })} />
      </div>
    </div>
  );
}

function CardEditor({ title, card, onChange }: { title: string; card: CardItem; onChange: (card: CardItem) => void }) {
  return (
    <div className="cms-mini-card">
      <h3>{title}</h3>
      <div className="cms-field-grid three">
        <TextField label="Метка" value={card.kicker} onChange={(kicker) => onChange({ ...card, kicker })} />
        <TextField label="Заголовок" value={card.title} onChange={(nextTitle) => onChange({ ...card, title: nextTitle })} />
        <TextField label="Ссылка" value={card.href || ""} onChange={(href) => onChange({ ...card, href: href || undefined })} />
      </div>
      <TextField label="Описание" value={card.text} multiline rows={3} onChange={(text) => onChange({ ...card, text })} />
    </div>
  );
}

function SectionEditor({ section, index, onChange }: { section: PageSection; index: number; onChange: (section: PageSection) => void }) {
  return (
    <details className="cms-group" open={index === 0}>
      <summary>{sectionNames[section.type]} · {index + 1}</summary>
      <div className="cms-group-inner">
        <div className="cms-field-grid three">
          <TextField label="ID блока" value={section.id || ""} onChange={(id) => onChange({ ...section, id: id || undefined })} />
          <TextField label="Надзаголовок" value={section.eyebrow || ""} onChange={(eyebrow) => onChange({ ...section, eyebrow })} />
          <TextField label="Заголовок" value={section.title || ""} onChange={(title) => onChange({ ...section, title })} />
        </div>
        {"text" in section ? (
          <TextField label="Текст блока" value={section.text || ""} multiline rows={4} onChange={(text) => onChange({ ...section, text })} />
        ) : null}
        {section.mockTitle !== undefined ? (
          <div className="cms-field-grid two">
            <TextField label="Заголовок мокапа" value={section.mockTitle} onChange={(mockTitle) => onChange({ ...section, mockTitle })} />
            <TextField label="Текст мокапа" value={section.mockText || ""} onChange={(mockText) => onChange({ ...section, mockText })} />
          </div>
        ) : null}
        {section.cards?.map((card, cardIndex) => (
          <CardEditor
            key={cardIndex}
            title={`Карточка ${cardIndex + 1}`}
            card={card}
            onChange={(nextCard) => onChange({ ...section, cards: section.cards?.map((current, currentIndex) => (currentIndex === cardIndex ? nextCard : current)) })}
          />
        ))}
        {section.items?.map((item, itemIndex) => (
          "value" in item ? (
            <div className="cms-mini-card" key={itemIndex}>
              <h3>Метрика {itemIndex + 1}</h3>
              <div className="cms-field-grid two">
                <TextField label="Значение" value={item.value} onChange={(value) => {
                  const items = [...(section.items || [])] as Array<{ value: string; label: string }>;
                  items[itemIndex] = { ...items[itemIndex], value };
                  onChange({ ...section, items });
                }} />
                <TextField label="Подпись" value={item.label} onChange={(label) => {
                  const items = [...(section.items || [])] as Array<{ value: string; label: string }>;
                  items[itemIndex] = { ...items[itemIndex], label };
                  onChange({ ...section, items });
                }} />
              </div>
            </div>
          ) : (
            <CardEditor
              key={itemIndex}
              title={`Пункт ${itemIndex + 1}`}
              card={item}
              onChange={(nextItem) => {
                const items = [...(section.items || [])] as CardItem[];
                items[itemIndex] = nextItem;
                onChange({ ...section, items });
              }}
            />
          )
        ))}
      </div>
    </details>
  );
}

export function AdminClient() {
  const [payload, setPayload] = useState<CmsPayload>(emptyPayload);
  const [status, setStatus] = useState("Загрузка контента...");
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<AdminTab>("settings");
  const [pageKey, setPageKey] = useState("home");
  const [courseSlug, setCourseSlug] = useState("");
  const [faviconVersion, setFaviconVersion] = useState(Date.now());

  const statusState = useMemo(() => statusClass(status), [status]);
  const pageEntries = Object.entries(payload.content.pages);
  const selectedPageKey = payload.content.pages[pageKey] ? pageKey : pageEntries[0]?.[0] || "home";
  const selectedPage = payload.content.pages[selectedPageKey];
  const selectedCourse = payload.content.courses.find((course) => course.slug === courseSlug) || payload.content.courses[0];

  function handleUnauthorized() {
    window.location.assign("/admin/login");
  }

  function editContent(mutator: (content: SiteContent) => void) {
    setPayload((current) => {
      const next = clone(current);
      next.content.settings.ui = { ...uiLabels, ...(next.content.settings.ui || {}) };
      next.content.settings.form = { ...formLabels, ...(next.content.settings.form || {}) };
      mutator(next.content);
      return next;
    });
    setDirty(true);
    setStatus("Есть несохранённые изменения.");
  }

  function updateSettings(mutator: (settings: SiteContent["settings"]) => void) {
    editContent((content) => mutator(content.settings));
  }

  function updatePage(mutator: (page: PageContent) => void) {
    editContent((content) => {
      const page = content.pages[selectedPageKey];
      if (page) mutator(page);
    });
  }

  function updateCourse(mutator: (course: CourseContent) => void) {
    editContent((content) => {
      const course = content.courses.find((item) => item.slug === selectedCourse?.slug);
      if (course) mutator(course);
    });
  }

  async function load() {
    setStatus("Загрузка...");
    const response = await fetch("/cms-api/content", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));

    if (response.status === 401) throw new Error("unauthorized");
    if (!response.ok || !result.content) throw new Error(result.error || "load_failed");

    const content = result.content as SiteContent;
    content.settings.ui = { ...uiLabels, ...(content.settings.ui || {}) };
    content.settings.form = { ...formLabels, ...(content.settings.form || {}) };
    setPayload({ content, lottieJsonText: result.lottieJsonText || "{}" });
    setCourseSlug(content.courses[0]?.slug || "");
    setDirty(false);
    setStatus("Готово.");
  }

  async function save() {
    setStatus("Сохранение...");
    const response = await fetch("/cms-api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));

    if (response.status === 401) throw new Error("unauthorized");
    if (!response.ok || !result.content) throw new Error(result.error || "save_failed");

    setPayload({ content: result.content, lottieJsonText: result.lottieJsonText || "{}" });
    setDirty(false);
    setStatus("Сохранено. SSR-страницы уже обновлены.");
  }

  async function logout() {
    await fetch("/cms-api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.assign("/admin/login");
  }

  async function uploadLottie(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    const text = await selected.text();
    try {
      JSON.parse(text);
      setPayload((current) => ({ ...current, lottieJsonText: text }));
      setDirty(true);
      setStatus("Lottie загружен, не забудьте сохранить.");
    } catch {
      setStatus("Файл не похож на валидный Lottie JSON.");
    }
  }

  async function uploadFavicon(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (selected.size > 256 * 1024) {
      setStatus("Файл favicon слишком большой. Максимум 256 KB.");
      return;
    }

    const formData = new FormData();
    formData.set("file", selected);
    setStatus("Загружаем favicon...");

    const response = await fetch("/cms-api/assets/favicon", {
      method: "PUT",
      body: formData
    });
    const result = await response.json().catch(() => ({}));

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      setStatus(result.error === "unsupported_type" ? "Поддерживаются только ICO, PNG или SVG." : "Не удалось загрузить favicon.");
      return;
    }

    setFaviconVersion(Date.now());
    setStatus("Favicon загружена.");
  }

  async function uploadAsset(file: File) {
    if (file.size > 3 * 1024 * 1024) {
      setStatus("Файл слишком большой. Максимум 3 MB.");
      throw new Error("file_too_large");
    }

    const formData = new FormData();
    formData.set("file", file);
    setStatus("Загружаем файл...");

    const response = await fetch("/cms-api/assets/upload", {
      method: "POST",
      body: formData
    });
    const result = await response.json().catch(() => ({}));

    if (response.status === 401) {
      handleUnauthorized();
      throw new Error("unauthorized");
    }

    if (!response.ok || !result.url) {
      setStatus(result.error === "unsupported_type" ? "Поддерживаются только изображения: SVG, PNG, JPG, WEBP, GIF, ICO." : "Не удалось загрузить файл.");
      throw new Error(result.error || "upload_failed");
    }

    setStatus("Файл загружен, не забудьте сохранить изменения.");
    return result.url as string;
  }

  useEffect(() => {
    load().catch((error) => {
      if (error.message === "unauthorized") {
        handleUnauthorized();
        return;
      }

      setStatus("Не удалось загрузить контент.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a className="brand" href="/" aria-label="Nexora">
          <img src="/assets/nexora-navbar-logo-b12.svg" alt="Nexora" />
        </a>
        <div className="admin-actions">
          <a className="ghost-button" href="/" target="_blank" rel="noopener noreferrer">Сайт</a>
          <button className="ghost-button" type="button" onClick={() => load().catch((error) => (error.message === "unauthorized" ? handleUnauthorized() : setStatus("Не удалось загрузить контент.")))}>Обновить</button>
          <button className="primary-button" type="button" onClick={() => save().catch((error) => (error.message === "unauthorized" ? handleUnauthorized() : setStatus("Не удалось сохранить.")))}>
            {dirty ? "Сохранить *" : "Сохранить"}
          </button>
          <button className="ghost-button danger" type="button" onClick={logout}>Выйти</button>
        </div>
      </header>

      <section className="status-row" aria-live="polite">
        <p data-state={statusState}>{status}</p>
      </section>

      <nav className="cms-tabs" aria-label="Редактор">
        {[
          ["settings", "Общее"],
          ["pages", "Страницы"],
          ["courses", "Курсы"],
          ["assets", "Иконка"],
          ["lottie", "Lottie"]
        ].map(([key, label]) => (
          <button key={key} className={tab === key ? "is-active" : ""} type="button" onClick={() => setTab(key as AdminTab)}>
            {label}
          </button>
        ))}
      </nav>

      <div className="cms-editor">
        {tab === "settings" ? (
          <Panel title="Общие тексты сайта" eyebrow="settings">
            <div className="cms-field-grid two">
              <TextField label="Текст футера" value={payload.content.settings.footerText} onChange={(footerText) => updateSettings((settings) => { settings.footerText = footerText; })} />
              <TextField label="Web3Forms access key" value={payload.content.settings.web3formsAccessKey} onChange={(web3formsAccessKey) => updateSettings((settings) => { settings.web3formsAccessKey = web3formsAccessKey; })} />
            </div>
            <div className="cms-field-grid two">
              <AssetField label="Лого navbar" value={payload.content.settings.brandLogo} uploadFile={uploadAsset} onChange={(brandLogo) => updateSettings((settings) => { settings.brandLogo = brandLogo; })} />
              <AssetField label="Лого navbar темное" value={payload.content.settings.brandLogoDark} uploadFile={uploadAsset} onChange={(brandLogoDark) => updateSettings((settings) => { settings.brandLogoDark = brandLogoDark; })} />
              <AssetField label="Лого футера" value={payload.content.settings.footerLogo} uploadFile={uploadAsset} onChange={(footerLogo) => updateSettings((settings) => { settings.footerLogo = footerLogo; })} />
              <AssetField label="Лого футера темное" value={payload.content.settings.footerLogoDark} uploadFile={uploadAsset} onChange={(footerLogoDark) => updateSettings((settings) => { settings.footerLogoDark = footerLogoDark; })} />
            </div>

            <div className="cms-mini-card">
              <h3>Навигация</h3>
              {payload.content.settings.nav.map((item, index) => (
                <div className="cms-field-grid two" key={index}>
                  <TextField label={`Пункт ${index + 1}`} value={item.label} onChange={(label) => updateSettings((settings) => { settings.nav[index].label = label; })} />
                  <TextField label="Ссылка" value={item.href} onChange={(href) => updateSettings((settings) => { settings.nav[index].href = href; })} />
                </div>
              ))}
            </div>

            <div className="cms-mini-card">
              <h3>Системные подписи курсов</h3>
              <div className="cms-field-grid three">
                {(Object.keys(uiLabels) as Array<keyof UiLabels>).map((key) => (
                  <TextField key={key} label={key} value={payload.content.settings.ui?.[key]} onChange={(value) => updateSettings((settings) => { settings.ui![key] = value; })} />
                ))}
              </div>
            </div>

            <div className="cms-mini-card">
              <h3>Форма заявки</h3>
              <div className="cms-field-grid three">
                {(Object.keys(formLabels) as Array<keyof LeadFormText>).map((key) => (
                  <TextField key={key} label={key} value={payload.content.settings.form?.[key]} onChange={(value) => updateSettings((settings) => { settings.form![key] = value; })} />
                ))}
              </div>
            </div>
          </Panel>
        ) : null}

        {tab === "pages" && selectedPage ? (
          <Panel title={pageNames[selectedPageKey] || selectedPageKey} eyebrow="pages">
            <div className="cms-picker">
              {pageEntries.map(([key]) => (
                <button key={key} className={selectedPageKey === key ? "is-active" : ""} type="button" onClick={() => setPageKey(key)}>
                  {pageNames[key] || key}
                </button>
              ))}
            </div>

            <div className="cms-mini-card">
              <h3>SEO и меню</h3>
              <div className="cms-field-grid three">
                <TextField label="SEO title" value={selectedPage.seo.title} onChange={(title) => updatePage((page) => { page.seo.title = title; })} />
                <TextField label="SEO description" value={selectedPage.seo.description} onChange={(description) => updatePage((page) => { page.seo.description = description; })} />
                <TextField label="CTA в меню" value={selectedPage.navCta} onChange={(navCta) => updatePage((page) => { page.navCta = navCta; })} />
              </div>
            </div>

            <div className="cms-mini-card">
              <h3>Hero</h3>
              <div className="cms-field-grid two">
                <TextField label="Надзаголовок" value={selectedPage.hero.eyebrow} onChange={(eyebrow) => updatePage((page) => { page.hero.eyebrow = eyebrow; })} />
                <TextField label="Заголовок" value={selectedPage.hero.title} onChange={(title) => updatePage((page) => { page.hero.title = title; })} />
              </div>
              <TextField label="Описание" value={selectedPage.hero.text} multiline rows={4} onChange={(text) => updatePage((page) => { page.hero.text = text; })} />
              <div className="cms-field-grid two">
                <ButtonEditor title="Основная кнопка" value={selectedPage.hero.primary} onChange={(primary) => updatePage((page) => { page.hero.primary = primary; })} />
                {selectedPage.hero.secondary ? <ButtonEditor title="Вторая кнопка" value={selectedPage.hero.secondary} onChange={(secondary) => updatePage((page) => { page.hero.secondary = secondary; })} /> : null}
              </div>
              {selectedPage.hero.orbit ? (
                <StringListEditor title="Плашки на фоне hero" items={selectedPage.hero.orbit} onChange={(orbit) => updatePage((page) => { page.hero.orbit = orbit; })} />
              ) : null}
            </div>

            {selectedPage.coursesTitle !== undefined ? (
              <TextField label="Заголовок блока курсов" value={selectedPage.coursesTitle} onChange={(coursesTitle) => updatePage((page) => { page.coursesTitle = coursesTitle; })} />
            ) : null}

            <div className="cms-mini-card">
              <h3>Форма внизу страницы</h3>
              <div className="cms-field-grid two">
                <TextField label="Надзаголовок" value={selectedPage.lead.eyebrow} onChange={(eyebrow) => updatePage((page) => { page.lead.eyebrow = eyebrow; })} />
                <TextField label="Заголовок" value={selectedPage.lead.title} onChange={(title) => updatePage((page) => { page.lead.title = title; })} />
                <TextField label="Интерес для письма" value={selectedPage.lead.interest} onChange={(interest) => updatePage((page) => { page.lead.interest = interest; })} />
                <TextField label="Текст кнопки" value={selectedPage.lead.button} onChange={(button) => updatePage((page) => { page.lead.button = button; })} />
              </div>
            </div>

            {selectedPage.sections.map((section, index) => (
              <SectionEditor
                key={`${section.type}-${index}`}
                section={section}
                index={index}
                onChange={(nextSection) => updatePage((page) => { page.sections[index] = nextSection; })}
              />
            ))}
          </Panel>
        ) : null}

        {tab === "courses" && selectedCourse ? (
          <Panel title={selectedCourse.title} eyebrow="courses">
            <div className="cms-picker">
              {payload.content.courses.map((course) => (
                <button key={course.slug} className={selectedCourse.slug === course.slug ? "is-active" : ""} type="button" onClick={() => setCourseSlug(course.slug)}>
                  {course.title}
                </button>
              ))}
            </div>
            <div className="cms-field-grid two">
              <TextField label="Название" value={selectedCourse.title} onChange={(title) => updateCourse((course) => { course.title = title; })} />
              <AssetField label="Картинка курса (ПК)" value={selectedCourse.imageDesktop || selectedCourse.image} uploadFile={uploadAsset} onChange={(imageDesktop) => updateCourse((course) => { course.imageDesktop = imageDesktop; course.image = imageDesktop; })} />
              <AssetField label="Картинка курса (мобилка)" value={selectedCourse.imageMobile || selectedCourse.imageDesktop || selectedCourse.image} uploadFile={uploadAsset} onChange={(imageMobile) => updateCourse((course) => { course.imageMobile = imageMobile; })} />
            </div>
            <TextField label="Описание в карточке" value={selectedCourse.description} multiline rows={4} onChange={(description) => updateCourse((course) => { course.description = description; })} />
            <TextField label="Описание на странице курса" value={selectedCourse.detailText} multiline rows={5} onChange={(detailText) => updateCourse((course) => { course.detailText = detailText; })} />
            <TextField label="Заголовок формы курса" value={selectedCourse.leadTitle} onChange={(leadTitle) => updateCourse((course) => { course.leadTitle = leadTitle; })} />
            <StringListEditor title="Буллеты карточки" items={selectedCourse.bullets} onChange={(bullets) => updateCourse((course) => { course.bullets = bullets; })} />
            <StringListEditor title="Программа обучения" items={selectedCourse.program} onChange={(program) => updateCourse((course) => { course.program = program; })} />
            <StringListEditor title="Результат после курса" items={selectedCourse.results} onChange={(results) => updateCourse((course) => { course.results = results; })} />
          </Panel>
        ) : null}

        {tab === "assets" ? (
          <Panel title="Иконка адресной строки" eyebrow="favicon">
            <div className="asset-tools favicon-tools">
              <div className="lottie-preview favicon-preview">
                <img src={`/cms-api/assets/favicon?v=${faviconVersion}`} alt="Текущая favicon" />
              </div>
              <label className="upload-control">
                <span>Загрузить favicon</span>
                <input type="file" accept=".ico,.png,.svg,image/x-icon,image/png,image/svg+xml" onChange={uploadFavicon} />
                <small>Поддерживаются ICO, PNG и SVG до 256 KB.</small>
              </label>
            </div>
          </Panel>
        ) : null}

        {tab === "lottie" ? (
          <Panel title="Lottie анимация NFC" eyebrow="assets">
            <div className="asset-tools">
              <label className="upload-control">
                <span>Загрузить Lottie JSON</span>
                <input type="file" accept="application/json,.json" onChange={uploadLottie} />
              </label>
              <div className="lottie-preview">
                {React.createElement("lottie-player", {
                  src: `data:application/json;base64,${btoa(unescape(encodeURIComponent(payload.lottieJsonText)))}`,
                  background: "transparent",
                  speed: "1",
                  loop: true,
                  autoplay: true
                })}
              </div>
            </div>
            <label className="cms-field">
              <span>Lottie JSON</span>
              <textarea
                value={payload.lottieJsonText}
                onChange={(event) => {
                  setPayload((current) => ({ ...current, lottieJsonText: event.target.value }));
                  setDirty(true);
                  setStatus("Есть несохранённые изменения.");
                }}
                rows={20}
              />
            </label>
          </Panel>
        ) : null}
      </div>
    </main>
  );
}
