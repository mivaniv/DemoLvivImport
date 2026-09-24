import { ArrowRight, Building2, FileText, PackageCheck, Store, Truck, Users, UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = { title: "Для бізнесу" };

const SEGMENTS = [
  { icon: Store, title: "Роздрібні мережі", text: "Стабільні поставки, планування асортименту та підтримка акцій." },
  { icon: UtensilsCrossed, title: "HoReCa", text: "Фасування для кухні та бару, регулярні поставки під меню." },
  { icon: Building2, title: "Дистриб'ютори", text: "Партнерські умови, палетні відвантаження, ексклюзивні позиції." },
  { icon: Users, title: "Корпоративні клієнти", text: "Кава й снеки для офісів, подарункові набори." },
];

const STEPS = [
  { icon: FileText, title: "Заявка", text: "Оберіть товари в каталозі та надішліть заявку — без реєстрації." },
  { icon: PackageCheck, title: "Пропозиція", text: "Менеджер надішле ціни та умови з урахуванням обсягу." },
  { icon: Truck, title: "Поставка", text: "Відвантажуємо зі складу у Львові по всій Україні." },
];

export default function BusinessPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Головна", href: "/" }, { label: "Для бізнесу" }]} />
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Для бізнесу</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Гнучкі умови співпраці та індивідуальний підхід для кожного формату бізнесу.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SEGMENTS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-line bg-white p-6">
            <Icon className="size-8 text-brand-600" strokeWidth={1.6} />
            <h2 className="mt-4 font-bold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-xl font-bold">Як ми працюємо</h2>
      <ol className="mt-5 grid gap-4 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="flex gap-4 rounded-2xl bg-brand-50 p-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white">{i + 1}</span>
            <div>
              <p className="flex items-center gap-2 font-bold">
                <Icon className="size-4 text-brand-600" /> {title}
              </p>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>

      <Link
        href="/catalog"
        className="mt-10 inline-flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-6 font-semibold text-white transition hover:bg-brand-700"
      >
        Перейти до каталогу <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
