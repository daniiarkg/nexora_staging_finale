import type { Metadata } from "next";
import Script from "next/script";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminClient } from "@/components/AdminClient";
import { ADMIN_SESSION_COOKIE, isAdminSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nexora Admin"
};

export default async function AdminPage() {
  const cookieStore = await cookies();

  if (!isAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }

  return (
    <>
      <Script src="https://unpkg.com/@lottiefiles/lottie-player@2.0.12/dist/lottie-player.js" strategy="afterInteractive" />
      <AdminClient />
    </>
  );
}
