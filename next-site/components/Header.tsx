"use client";

import Link from "next/link";
import { useState } from "react";
import type { ButtonLink, SiteContent } from "@/lib/types";

type HeaderProps = {
  settings: SiteContent["settings"];
  active: string;
  cta: string;
  dark?: boolean;
};

function isActive(item: ButtonLink, active: string) {
  return item.href.replace(/^\//, "") === active.replace(/^\//, "");
}

export function Header({ settings, active, cta, dark }: HeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className={`site-nav${open ? " is-open" : ""}`}>
      <Link className="brand" href="/" aria-label="Nexora">
        <img src={dark ? settings.brandLogoDark : settings.brandLogo} alt="Nexora" />
      </Link>
      <nav className="nav-links" aria-label="Разделы">
        {settings.nav.map((item) => (
          <Link key={item.href} href={item.href} className={isActive(item, active) ? "is-active" : ""}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="nav-actions">
        <a className="nav-cta" href="#lead">
          {cta}
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-label="Открыть меню"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
