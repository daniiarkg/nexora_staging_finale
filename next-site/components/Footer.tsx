import Link from "next/link";
import type { SiteContent } from "@/lib/types";

export function Footer({ settings, dark }: { settings: SiteContent["settings"]; dark?: boolean }) {
  return (
    <footer className="site-footer">
      <Link className="footer-brand" href="/">
        <img src={dark ? settings.footerLogoDark : settings.footerLogo} alt="Nexora" />
      </Link>
      <nav>
        {settings.nav.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <p>{settings.footerText}</p>
    </footer>
  );
}
