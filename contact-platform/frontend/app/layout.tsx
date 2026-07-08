import "./globals.css";
import type { Metadata } from "next";
import { withSettingsDefaults } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const api = process.env.INTERNAL_API_URL || "http://localhost:8080";
  const response = await fetch(`${api}/api/public/settings`, { cache: "no-store" }).catch(() => undefined);
  const data = response?.ok ? await response.json().catch(() => ({})) : {};
  const settings = withSettingsDefaults(data.settings);
  return {
    title: "Nexora Contacts",
    description: "Контактные карточки и мини-витрины Nexora",
    icons: settings.favicon_url ? { icon: settings.favicon_url, shortcut: settings.favicon_url, apple: settings.favicon_url } : undefined
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
