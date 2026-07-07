import fs from "node:fs/promises";
import path from "node:path";
import type { CmsPayload, CourseContent, LeadFormText, SiteContent, UiLabels } from "./types";

const DATA_DIR = process.env.CONTENT_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
const CONTENT_FILE = process.env.CONTENT_FILE || path.join(DATA_DIR, "content.json");
const LOTTIE_FILE = process.env.LOTTIE_FILE || path.join(DATA_DIR, "nfc-lottie.json");
const FAVICON_FILE = process.env.FAVICON_FILE || path.join(DATA_DIR, "favicon");
const FAVICON_META_FILE = process.env.FAVICON_META_FILE || path.join(DATA_DIR, "favicon.json");
const DEFAULT_LOTTIE_FILE = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "assets", "nfc_contacts_lottie.json");
const DEFAULT_CONTENT_FILE = path.join(/*turbopackIgnore: true*/ process.cwd(), "content", "default-content.json");
const DEFAULT_FAVICON_FILE = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "favicon.ico");

export const DEFAULT_UI_LABELS: UiLabels = {
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

export const DEFAULT_LEAD_FORM_TEXT: LeadFormText = {
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

type FileCache<T> = {
  signature: string;
  value: T;
};

let contentFilesReady = false;
let ensureContentFilesPromise: Promise<void> | null = null;
let contentCache: FileCache<SiteContent> | null = null;
let lottieCache: FileCache<string> | null = null;
let faviconCache: FileCache<{ bytes: Buffer; contentType: string }> | null = null;

function fileSignature(stats: { mtimeMs: number; size: number }) {
  return `${stats.mtimeMs}:${stats.size}`;
}

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeJsonAtomic(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temp, filePath);
}

async function writeTextAtomic(filePath: string, value: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(temp, value, "utf8");
  await fs.rename(temp, filePath);
}

async function writeBufferAtomic(filePath: string, value: Buffer) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(temp, value);
  await fs.rename(temp, filePath);
}

function normalizeContent(content: SiteContent): SiteContent {
  return {
    ...content,
    settings: {
      ...content.settings,
      ui: { ...DEFAULT_UI_LABELS, ...(content.settings.ui || {}) },
      form: { ...DEFAULT_LEAD_FORM_TEXT, ...(content.settings.form || {}) }
    }
  };
}

export async function ensureContentFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  if (!(await pathExists(CONTENT_FILE))) {
    const fallback = await fs.readFile(DEFAULT_CONTENT_FILE, "utf8");
    JSON.parse(fallback);
    await writeTextAtomic(CONTENT_FILE, fallback);
  }

  if (!(await pathExists(LOTTIE_FILE))) {
    const fallback = await fs.readFile(DEFAULT_LOTTIE_FILE, "utf8");
    await writeTextAtomic(LOTTIE_FILE, fallback);
  }

  if (!(await pathExists(FAVICON_FILE))) {
    const fallback = await fs.readFile(DEFAULT_FAVICON_FILE);
    await writeBufferAtomic(FAVICON_FILE, fallback);
    await writeJsonAtomic(FAVICON_META_FILE, { contentType: "image/x-icon" });
  }

  contentFilesReady = true;
}

async function ensureContentFilesOnce() {
  if (contentFilesReady) return;

  ensureContentFilesPromise ||= ensureContentFiles().finally(() => {
    ensureContentFilesPromise = null;
  });

  await ensureContentFilesPromise;
}

export async function readContent(): Promise<SiteContent> {
  await ensureContentFilesOnce();
  const stats = await fs.stat(CONTENT_FILE);
  const signature = fileSignature(stats);

  if (contentCache?.signature === signature) {
    return contentCache.value;
  }

  const raw = await fs.readFile(CONTENT_FILE, "utf8");
  const value = normalizeContent(JSON.parse(raw) as SiteContent);
  contentCache = { signature, value };
  return value;
}

export async function readLottieJsonText() {
  await ensureContentFilesOnce();
  const stats = await fs.stat(LOTTIE_FILE);
  const signature = fileSignature(stats);

  if (lottieCache?.signature === signature) {
    return lottieCache.value;
  }

  const value = await fs.readFile(LOTTIE_FILE, "utf8");
  lottieCache = { signature, value };
  return value;
}

export async function readCmsPayload(): Promise<CmsPayload> {
  const [content, lottieJsonText] = await Promise.all([readContent(), readLottieJsonText()]);
  return { content, lottieJsonText };
}

export async function readFaviconAsset() {
  await ensureContentFilesOnce();
  const [stats, metaRaw] = await Promise.all([
    fs.stat(FAVICON_FILE),
    fs.readFile(FAVICON_META_FILE, "utf8").catch(() => "{\"contentType\":\"image/x-icon\"}")
  ]);
  const signature = fileSignature(stats);

  if (faviconCache?.signature === signature) {
    return faviconCache.value;
  }

  const meta = JSON.parse(metaRaw) as { contentType?: string };
  const value = {
    bytes: await fs.readFile(FAVICON_FILE),
    contentType: meta.contentType || "image/x-icon"
  };
  faviconCache = { signature, value };
  return value;
}

export async function writeFaviconAsset(bytes: Buffer, contentType: string) {
  await ensureContentFilesOnce();
  await writeBufferAtomic(FAVICON_FILE, bytes);
  await writeJsonAtomic(FAVICON_META_FILE, { contentType });
  const stats = await fs.stat(FAVICON_FILE);
  faviconCache = { signature: fileSignature(stats), value: { bytes, contentType } };
}

export async function writeCmsPayload(payload: Partial<CmsPayload>) {
  if (payload.content) {
    if (!payload.content.settings || !payload.content.pages || !Array.isArray(payload.content.courses)) {
      throw new Error("Content structure is invalid");
    }
  }

  if (typeof payload.lottieJsonText === "string") {
    JSON.parse(payload.lottieJsonText);
  }

  if (payload.content) {
    const normalized = normalizeContent(payload.content);
    await writeJsonAtomic(CONTENT_FILE, normalized);
    const stats = await fs.stat(CONTENT_FILE);
    contentCache = { signature: fileSignature(stats), value: normalized };
  }

  if (typeof payload.lottieJsonText === "string") {
    await writeTextAtomic(LOTTIE_FILE, payload.lottieJsonText);
    const stats = await fs.stat(LOTTIE_FILE);
    lottieCache = { signature: fileSignature(stats), value: payload.lottieJsonText };
  }

  return readCmsPayload();
}

export async function getPage(key: string) {
  const content = await readContent();
  return { content, page: content.pages[key] };
}

export async function getCourse(slug: string): Promise<{ content: SiteContent; course?: CourseContent }> {
  const content = await readContent();
  return { content, course: content.courses.find((item) => item.slug === slug) };
}

export async function courseSlugs() {
  const content = await readContent();
  return content.courses.map((course) => course.slug);
}
