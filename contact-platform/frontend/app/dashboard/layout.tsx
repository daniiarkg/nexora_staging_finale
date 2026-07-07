import Link from "next/link";
import { RequireSuper } from "@/components/RequireSuper";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSuper>
      <div className="dashboard-shell">
        <nav className="dash-nav">
          <Link className="dash-brand" href="/dashboard">Nexora Contacts</Link>
          <div className="dash-links">
            <Link href="/dashboard/cards">Карточки</Link>
            <Link href="/dashboard/designs">Дизайны</Link>
            <Link href="/dashboard/settings">Настройки</Link>
          </div>
          <Link className="button secondary compact" href="/">Сайт</Link>
        </nav>
        {children}
      </div>
    </RequireSuper>
  );
}
