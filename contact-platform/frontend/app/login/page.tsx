import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return <main className="auth-page"><AuthForm mode="login" /><Link className="auth-switch" href="/register">Создать аккаунт</Link></main>;
}
