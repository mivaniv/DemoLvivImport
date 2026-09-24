import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = { title: "Контакти" };

// TODO: замінити на реальні контакти компанії перед показом клієнтам.
const CONTACTS = [
  { icon: Phone, label: "Телефон", value: "+380 00 000 00 00", href: "tel:+380000000000" },
  { icon: Mail, label: "Email", value: "info@lvivimport.com", href: "mailto:info@lvivimport.com" },
  { icon: MapPin, label: "Склад і офіс", value: "м. Львів" },
  { icon: Clock, label: "Графік", value: "Пн–Пт, 9:00–18:00" },
];

export default function ContactsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Головна", href: "/" }, { label: "Контакти" }]} />
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Контакти</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <ul className="grid gap-4 sm:grid-cols-2">
          {CONTACTS.map(({ icon: Icon, label, value, href }) => (
            <li key={label} className="rounded-2xl border border-line bg-white p-5">
              <Icon className="size-6 text-brand-600" strokeWidth={1.6} />
              <p className="mt-3 text-xs text-muted">{label}</p>
              {href ? (
                <a href={href} className="font-semibold hover:text-brand-600">
                  {value}
                </a>
              ) : (
                <p className="font-semibold">{value}</p>
              )}
            </li>
          ))}
        </ul>
        <div className="rounded-2xl bg-gradient-to-br from-navy-900 to-navy-700 p-7 text-white">
          <h2 className="text-xl font-bold">Потрібна комерційна пропозиція?</h2>
          <p className="mt-2 text-sm text-white/75">
            Додайте товари до заявки в каталозі — менеджер надішле ціни та умови поставки з урахуванням вашого обсягу.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/catalog" className="inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold hover:bg-brand-500">
              До каталогу
            </Link>
            <Link href="/request" className="inline-flex h-11 items-center rounded-xl border border-white/30 px-5 text-sm font-semibold hover:bg-white/10">
              Моя заявка
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
