import type { Metadata } from "next";
import Link from "next/link";
import { LostPasswordForm } from "@/components/account/AuthForms";
import { AuthShell } from "@/components/account/AuthShell";

export const metadata: Metadata = { title: "Відновлення пароля", robots: { index: false } };

export default function LostPasswordPage() {
  return (
    <AuthShell title="Забули пароль?" subtitle="Вкажіть email, з яким ви реєструвались, — ми надішлемо посилання для зміни пароля.">
      <LostPasswordForm />
      <Link href="/account/login" className="mt-5 inline-block text-sm font-medium text-brand-600 hover:underline">
        ← Повернутися до входу
      </Link>
    </AuthShell>
  );
}
