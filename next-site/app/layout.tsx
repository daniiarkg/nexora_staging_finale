import type { Metadata } from "next";
import { AppEffects } from "@/components/AppEffects";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nexora.kg"),
  title: "Nexora",
  description: "AI-продукты, обучение и автоматизация для бизнеса и команд.",
  icons: {
    icon: "/cms-api/assets/favicon"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AppEffects />
        {children}
      </body>
    </html>
  );
}
