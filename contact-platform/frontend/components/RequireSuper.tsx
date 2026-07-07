"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { User } from "@/lib/types";

export function RequireSuper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    apiFetch<{ user: User | null }>("/api/auth/me").then((data) => setUser(data.user)).catch(() => setUser(null));
  }, []);

  if (user === undefined) return <main className="panel">Загрузка...</main>;
  if (!user) return <main className="panel"><h1>Нужен вход</h1><Link className="button" href="/login">Войти</Link></main>;
  if (user.role !== "super_user") return <main className="panel"><h1>Нет доступа</h1><p>Обычный пользователь может смотреть только публичные карточки.</p></main>;
  return <>{children}</>;
}
