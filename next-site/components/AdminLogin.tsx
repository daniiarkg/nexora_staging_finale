"use client";

import { FormEvent, useState } from "react";

function statusClass(status: string) {
  if (status.includes("Невер") || status.includes("ошиб") || status.includes("Не удалось")) return "error";
  return "";
}

export function AdminLogin() {
  const [user, setUser] = useState("root");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("Проверяем доступ...");

    const response = await fetch("/cms-api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, password })
    });

    if (response.ok) {
      window.location.assign("/admin");
      return;
    }

    setSubmitting(false);
    setStatus(response.status === 401 ? "Неверный логин или пароль." : "Не удалось войти. Попробуйте еще раз.");
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <a className="admin-login-brand" href="/" aria-label="Nexora">
          <img src="/assets/nexora-navbar-logo-b12.svg" alt="Nexora" />
        </a>
        <div>
          <p className="eyebrow">admin</p>
          <h1>Вход в панель</h1>
        </div>
        <form className="login-form" onSubmit={submit}>
          <label>
            <span>Логин</span>
            <input value={user} onChange={(event) => setUser(event.target.value)} autoComplete="username" required />
          </label>
          <label>
            <span>Пароль</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
          </label>
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Входим..." : "Войти"}
          </button>
        </form>
        {status ? <p className="login-status" data-state={statusClass(status)}>{status}</p> : null}
      </section>
    </main>
  );
}
