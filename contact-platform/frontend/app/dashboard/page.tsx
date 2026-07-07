import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="dashboard-page">
      <section className="panel panel-wide">
        <p className="eyebrow">Dashboard</p>
        <h1>Управление карточками</h1>
        <p className="section-copy">Создавайте контакты, магазины, дизайны и бренд-настройки из одного рабочего пространства.</p>
        <div className="quick-grid">
          <Link className="quick-card" href="/dashboard/cards/new"><b>Новая карточка</b><span>Контакт или магазин с live preview</span></Link>
          <Link className="quick-card" href="/dashboard/cards"><b>Все карточки</b><span>Публикация, редактирование и публичные ссылки</span></Link>
          <Link className="quick-card" href="/dashboard/designs"><b>Дизайны</b><span>Пресеты, цвета и layout карточек</span></Link>
          <Link className="quick-card" href="/dashboard/settings"><b>Настройки сайта</b><span>Лендинг, favicon, лого и demo-карточка</span></Link>
        </div>
      </section>
    </main>
  );
}
