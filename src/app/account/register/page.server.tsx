import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/account/AuthForms";
import { AuthShell } from "@/components/account/AuthShell";
import { getViewer } from "@/lib/auth/session";
import { B2B_ENABLED } from "@/lib/features";

export const metadata: Metadata = { title: "Стати клієнтом" };

export default async function RegisterPage() {
  if (!B2B_ENABLED) redirect("/"); // кабінет ще не запущено — реєстрацію не приймаємо
  if (await getViewer()) redirect("/account");
  return (
    <AuthShell
      title="Стати клієнтом"
      subtitle="Заповніть заявку — менеджер перевірить дані й відкриє доступ до оптових цін і замовлень. Умови оплати та доставки визначаються персонально в договорі."
      aside={
        <p className="border-t border-white/15 pt-5 text-sm text-white/80">
          Уже маєте акаунт?{" "}
          <Link href="/account/login" className="font-semibold text-gold hover:underline">
            Увійти
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
