import Link from "next/link";
import { CardPreview, demoCard } from "@/components/CardPreview";

export default function HomePage() {
  return (
    <main className="landing">
      <nav className="site-nav">
        <Link className="site-brand" href="/">Nexora Contacts</Link>
        <div className="site-actions">
          <Link href="/login">Войти</Link>
          <Link className="button compact" href="/dashboard">Dashboard</Link>
        </div>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Nexora Contacts</p>
          <h1>Контактные карточки и мини-витрины без лишней возни.</h1>
          <p className="lead">Публичные ссылки, VCF, несколько телефонов, товары, кастомный дизайн и предпросмотр в одном аккуратном рабочем интерфейсе.</p>
          <div className="actions">
            <Link className="button" href="/login">Войти</Link>
            <Link className="button secondary" href="/register">Регистрация</Link>
          </div>
          <div className="feature-row">
            <span>Person cards</span>
            <span>Store catalog</span>
            <span>VCF export</span>
          </div>
        </div>
        <div className="hero-preview">
          <CardPreview card={demoCard()} />
        </div>
      </section>
    </main>
  );
}
