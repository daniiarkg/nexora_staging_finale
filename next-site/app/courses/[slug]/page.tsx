import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CoursePage } from "@/components/PageRenderer";
import { courseSlugs, getCourse } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const slugs = await courseSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { course } = await getCourse(slug);

  if (!course) {
    return { title: "Курс не найден — Nexora" };
  }

  return {
    title: `${course.title} — Nexora`,
    description: course.detailText
  };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { content, course } = await getCourse(slug);

  if (!course) notFound();

  return <CoursePage content={content} course={course} />;
}
