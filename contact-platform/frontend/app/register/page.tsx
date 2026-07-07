import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return <main className="auth-page"><AuthForm mode="register" /><Link className="auth-switch" href="/login">Уже есть аккаунт</Link></main>;
}
