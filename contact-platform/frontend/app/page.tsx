import Link from "next/link";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import { CardPreview } from "@/components/CardPreview";
import { withSettingsDefaults } from "@/lib/settings";
import type { AppSettings, User } from "@/lib/types";

async function getSettings(): Promise<AppSettings> {
  const api = process.env.INTERNAL_API_URL || "http://localhost:8080";
  const response = await fetch(`${api}/api/public/settings`, { cache: "no-store" }).catch(() => undefined);
  if (!response?.ok) return withSettingsDefaults();
  const data = await response.json().catch(() => ({}));
  return withSettingsDefaults(data.settings);
}

async function getCurrentUser(): Promise<User | null> {
  const api = process.env.INTERNAL_API_URL || "http://localhost:8080";
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  if (!cookieHeader) return null;
  const response = await fetch(`${api}/api/auth/me`, {
    cache: "no-store",
    headers: { Cookie: cookieHeader }
  }).catch(() => undefined);
  if (!response?.ok) return null;
  const data = await response.json().catch(() => ({}));
  return data.user || null;
}

export default async function HomePage() {
  const settings = await getSettings();
  const user = await getCurrentUser();
  const accountAction = user
    ? { href: "/dashboard", label: "Dashboard" }
    : { href: "/login", label: "Войти" };
  return (
    <main className="landing">
      <nav className="site-nav">
        <Link className="site-brand" href="/" aria-label="Nexora Contacts">
          {settings.landing_logo_url ? <img src={settings.landing_logo_url} alt="" style={{ "--landing-logo-min-width": `${settings.landing_logo_min_width}px` } as CSSProperties} /> : null}
        </Link>
        <div className="site-actions">
          <Link className="button compact" href={accountAction.href}>{accountAction.label}</Link>
        </div>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{settings.landing_eyebrow}</p>
          <h1>{settings.landing_title}</h1>
          <p className="lead">{settings.landing_lead}</p>
          <div className="actions">
            <Link className="button" href={user ? accountAction.href : settings.landing_primary_href}>{user ? accountAction.label : settings.landing_primary_label}</Link>
            {!user ? <Link className="button secondary" href={settings.landing_secondary_href}>{settings.landing_secondary_label}</Link> : null}
          </div>
          <div className="feature-row">
            {settings.landing_features.map((feature) => <span key={feature}>{feature}</span>)}
          </div>
        </div>
        <div className="hero-preview">
          <CardPreview card={settings.landing_card} translations={settings.translations} />
        </div>
      </section>
    </main>
  );
}
