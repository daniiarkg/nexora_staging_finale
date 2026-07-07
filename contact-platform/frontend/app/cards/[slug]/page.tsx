import { CardPreview } from "@/components/CardPreview";
import type { AppSettings, Card } from "@/lib/types";

async function getPublicCard(slug: string): Promise<Card | undefined> {
  const api = process.env.INTERNAL_API_URL || "http://localhost:8080";
  const response = await fetch(`${api}/api/public/cards/${slug}`, { cache: "no-store" });
  if (!response.ok) return undefined;
  const data = await response.json();
  return data.card;
}

async function getSettings(): Promise<AppSettings> {
  const api = process.env.INTERNAL_API_URL || "http://localhost:8080";
  const response = await fetch(`${api}/api/public/settings`, { cache: "no-store" });
  if (!response.ok) return { default_logo_url: "" };
  const data = await response.json();
  return data.settings || { default_logo_url: "" };
}

export default async function PublicCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [card, settings] = await Promise.all([getPublicCard(slug), getSettings()]);
  if (!card) return <main className="panel">Карточка не найдена или не опубликована.</main>;
  return <main className="public-card-page"><CardPreview card={card} defaultLogoUrl={settings.default_logo_url} vcfHref={`/api/public/cards/${card.slug}/vcf`} /></main>;
}
