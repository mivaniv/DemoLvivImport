import { Lock } from "lucide-react";
import { AuthShell } from "@/components/account/AuthShell";
import { MAIN_PHONE, OFFICE } from "@/content/company";

// Статична демоверсія (GitHub Pages): кабінету без сервера немає — пояснюємо й даємо контакти.
export function StaticAccountNotice({ title }: { title: string }) {
  return (
    <AuthShell title={title}>
      <p className="flex gap-3 rounded-xl bg-brand-50 p-4 text-sm text-navy-800">
        <Lock className="mt-0.5 size-5 shrink-0 text-brand-600" />
        <span>
          Це демоверсія сайту без сервера: вхід, ціни й замовлення працюють у повній версії. Щоб стати клієнтом, зателефонуйте{" "}
          <a href={MAIN_PHONE.href} className="font-semibold text-brand-600">{MAIN_PHONE.label}</a> або напишіть на{" "}
          <a href={`mailto:${OFFICE.email}`} className="font-semibold text-brand-600">{OFFICE.email}</a>.
        </span>
      </p>
    </AuthShell>
  );
}
