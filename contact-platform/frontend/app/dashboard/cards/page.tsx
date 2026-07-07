"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Card } from "@/lib/types";

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    apiFetch<{ cards: Card[] }>("/api/cards").then((data) => setCards(data.cards)).catch((err) => setError(err.message));
  }, []);
  return (
    <main className="dashboard-page">
      <section className="panel panel-wide">
        <div className="toolbar">
          <div>
            <p className="eyebrow">Cards</p>
            <h1>Карточки</h1>
          </div>
          <Link className="button" href="/dashboard/cards/new">Создать</Link>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="list">
          {cards.map((card) => (
            <article className="list-item" key={card.id}>
              <div><b>{card.name}</b><span>{card.type} · {card.status} · {card.slug}</span></div>
              <div className="actions"><Link className="button secondary compact" href={`/dashboard/cards/${card.id}/edit`}>Edit</Link><Link className="button ghost compact" href={`/cards/${card.slug}`}>Public</Link></div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
