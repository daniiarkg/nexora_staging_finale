import { DesignEditor } from "@/components/DesignEditor";
import type { Design } from "@/lib/types";
import { cookies } from "next/headers";

async function getDesign(id: string): Promise<Design | undefined> {
  const api = process.env.INTERNAL_API_URL || "http://localhost:8080";
  const cookieStore = await cookies();
  const response = await fetch(`${api}/api/designs/${id}`, { cache: "no-store", headers: { Cookie: cookieStore.toString() } });
  if (!response.ok) return undefined;
  const data = await response.json();
  return data.design;
}

export default async function EditDesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const design = await getDesign(id);
  return design ? <DesignEditor initial={design} /> : <main className="panel">Дизайн не найден</main>;
}
