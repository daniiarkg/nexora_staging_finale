import type { Metadata } from "next";
import Script from "next/script";
import { SitePage } from "@/components/PageRenderer";
import { getPage } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await getPage("nfc");
  return { title: page.seo.title, description: page.seo.description };
}

export default async function NfcPage() {
  const { content } = await getPage("nfc");
  return (
    <>
      <Script src="https://unpkg.com/@lottiefiles/lottie-player@2.0.12/dist/lottie-player.js" strategy="afterInteractive" />
      <SitePage content={content} pageKey="nfc" />
    </>
  );
}
