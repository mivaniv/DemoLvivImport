import { BadgeCheck, FileSpreadsheet, ShoppingCart, Tags } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

// Обгортка сторінок входу/реєстрації: форма + що дає кабінет.
const BENEFITS = [
  { icon: Tags, text: "Оптові ціни на весь асортимент" },
  { icon: ShoppingCart, text: "Замовлення онлайн у будь-який час" },
  { icon: FileSpreadsheet, text: "Прайс-лист у форматі Excel" },
  { icon: BadgeCheck, text: "Історія замовлень і статуси" },
];

export function AuthShell({ title, subtitle, children, aside }: { title: string; subtitle?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Головна", href: "/" }, { label: "Особистий кабінет" }]} />
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </section>
        <aside className="h-fit space-y-5 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-700 p-6 text-white sm:p-8">
          <p className="text-lg font-bold">Кабінет клієнта Львівімпорт</p>
          <ul className="space-y-3 text-sm text-white/85">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <Icon className="size-5 shrink-0 text-gold" /> {text}
              </li>
            ))}
          </ul>
          {aside}
        </aside>
      </div>
    </div>
  );
}
