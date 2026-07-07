import Link from "next/link";

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="dashboard-page"><section className="panel"><h1>Card</h1><Link className="button" href={`/dashboard/cards/${id}/edit`}>Редактировать</Link></section></main>;
}
