import type { Metadata } from "next";
import { SitePage } from "@/components/PageRenderer";
import { getPage } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await getPage("courses");
  return { title: page.seo.title, description: page.seo.description };
}

export default async function CoursesPage() {
  const { content } = await getPage("courses");
  return <SitePage content={content} pageKey="courses" />;
}
