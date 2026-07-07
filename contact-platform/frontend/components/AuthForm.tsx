"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState(mode === "login" ? "root" : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "request_failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <p className="eyebrow">{mode === "login" ? "Sign in" : "Create account"}</p>
      <h1>{mode === "login" ? "Вход" : "Регистрация"}</h1>
      <p className="section-copy">{mode === "login" ? "Войдите в dashboard для управления карточками." : "Обычный аккаунт пока получает доступ только к публичным страницам."}</p>
      <label>
        <span>Login / email</span>
        <input value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      <label>
        <span>Password</span>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button disabled={loading}>{loading ? "..." : mode === "login" ? "Войти" : "Зарегистрироваться"}</button>
    </form>
  );
}
