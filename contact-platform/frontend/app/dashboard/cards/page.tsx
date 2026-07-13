"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Card } from "@/lib/types";

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});
  useEffect(() => {
    apiFetch<{ cards: Card[] }>("/api/cards").then((data) => setCards(data.cards)).catch((err) => setError(err.message));
  }, []);

  async function changeStatus(card: Card, status: Card["status"]) {
    const id = card.id;
    if (!id || card.status === status) return;
    setError("");
    setUpdatingStatus((current) => ({ ...current, [id]: true }));
    try {
      const action = status === "published" ? "publish" : "unpublish";
      const result = await apiFetch<{ card: Card }>(`/api/cards/${id}/${action}`, { method: "POST" });
      setCards((current) => current.map((item) => item.id === id ? result.card : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "status_update_failed");
    } finally {
      setUpdatingStatus((current) => ({ ...current, [id]: false }));
    }
  }

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
              <div className="actions">
                <select
                  className="compact-select"
                  value={card.status}
                  onChange={(event) => changeStatus(card, event.target.value as Card["status"])}
                  disabled={!card.id || Boolean(card.id && updatingStatus[card.id])}
                  aria-label={`Статус карточки ${card.name}`}
                >
                  <option value="draft">Черновик</option>
                  <option value="published">Опубликовано</option>
                </select>
                <Link className="button secondary compact" href={`/dashboard/cards/${card.id}/edit`}>Edit</Link>
                <Link className="button ghost compact" href={`/cards/${card.slug}`}>Public</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
