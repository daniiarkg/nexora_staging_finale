"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Design } from "@/lib/types";

export default function DesignsPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  useEffect(() => { apiFetch<{ designs: Design[] }>("/api/designs").then((d) => setDesigns(d.designs)).catch(() => setDesigns([])); }, []);
  return (
    <main className="dashboard-page">
      <section className="panel panel-wide">
        <div className="toolbar">
          <div>
            <p className="eyebrow">Designs</p>
            <h1>Дизайны</h1>
          </div>
          <Link className="button" href="/dashboard/designs/new">Создать</Link>
        </div>
        <div className="list">
          {designs.map((design) => (
            <article className="list-item" key={design.id}>
              <div><b>{design.name}</b><span>{design.background_type === "gradient" ? "Градиент" : "Цвет"} · {design.font_family} · {design.font_weight}</span></div>
              <Link className="button secondary compact" href={`/dashboard/designs/${design.id}/edit`}>Edit</Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
