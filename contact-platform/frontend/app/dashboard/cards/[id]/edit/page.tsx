import { CardEditor } from "@/components/CardEditor";
import type { Card } from "@/lib/types";
import { cookies } from "next/headers";

async function getCard(id: string): Promise<Card | undefined> {
  const api = process.env.INTERNAL_API_URL || "http://localhost:8080";
  const cookieStore = await cookies();
  const response = await fetch(`${api}/api/cards/${id}`, { cache: "no-store", headers: { Cookie: cookieStore.toString() } });
  if (!response.ok) return undefined;
  const data = await response.json();
  return data.card;
}

export default async function EditCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  return card ? <CardEditor initial={card} /> : <main className="panel">Карточка не найдена</main>;
}
