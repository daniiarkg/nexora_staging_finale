import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLogin } from "@/components/AdminLogin";
import { ADMIN_SESSION_COOKIE, isAdminSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вход в админку — Nexora"
};

export default async function AdminLoginPage() {
  const cookieStore = await cookies();

  if (isAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin");
  }

  return <AdminLogin />;
}
