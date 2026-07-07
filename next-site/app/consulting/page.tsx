import type { Metadata } from "next";
import { SitePage } from "@/components/PageRenderer";
import { getPage } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await getPage("consulting");
  return { title: page.seo.title, description: page.seo.description };
}

export default async function ConsultingPage() {
  const { content } = await getPage("consulting");
  return <SitePage content={content} pageKey="consulting" />;
}
