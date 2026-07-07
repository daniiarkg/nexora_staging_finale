import Link from "next/link";
import { CardPreview } from "@/components/CardPreview";
import { withSettingsDefaults } from "@/lib/settings";
import type { AppSettings } from "@/lib/types";

async function getSettings(): Promise<AppSettings> {
  const api = process.env.INTERNAL_API_URL || "http://localhost:8080";
  const response = await fetch(`${api}/api/public/settings`, { cache: "no-store" }).catch(() => undefined);
  if (!response?.ok) return withSettingsDefaults();
  const data = await response.json().catch(() => ({}));
  return withSettingsDefaults(data.settings);
}

export default async function HomePage() {
  const settings = await getSettings();
  return (
    <main className="landing">
      <nav className="site-nav">
        <Link className="site-brand" href="/">
          {settings.landing_logo_url ? <img src={settings.landing_logo_url} alt="Nexora" /> : null}
          <span>Nexora Contacts</span>
        </Link>
        <div className="site-actions">
          <Link href="/login">Войти</Link>
          <Link className="button compact" href="/dashboard">Dashboard</Link>
        </div>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{settings.landing_eyebrow}</p>
          <h1>{settings.landing_title}</h1>
          <p className="lead">{settings.landing_lead}</p>
          <div className="actions">
            <Link className="button" href={settings.landing_primary_href}>{settings.landing_primary_label}</Link>
            <Link className="button secondary" href={settings.landing_secondary_href}>{settings.landing_secondary_label}</Link>
          </div>
          <div className="feature-row">
            {settings.landing_features.map((feature) => <span key={feature}>{feature}</span>)}
          </div>
        </div>
        <div className="hero-preview">
          <CardPreview card={settings.landing_card} />
        </div>
      </section>
    </main>
  );
}
