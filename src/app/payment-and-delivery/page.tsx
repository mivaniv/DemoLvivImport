import { Building2, Package, Store, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TextPage } from "@/components/ui/TextPage";
import { COMPANY, MAIN_PHONE, OFFICE, WAREHOUSE_HOURS } from "@/content/company";
import { deliveryPage } from "@/content/legal";
import { PARTNER_CTA } from "@/lib/features";

export const metadata: Metadata = { title: deliveryPage.title };

// Способи доставки — як на lvivimport.com
const METHODS = [
  { icon: Truck, title: "Власна логістика", text: "Доставка власним автопарком Львівімпорт." },
  { icon: Package, title: "Перевізники", text: "Нова пошта, Делівері, Meest — по всій Україні." },
  { icon: Store, title: "Самовивіз", text: `Зі складу: ${COMPANY.address}. Склад працює з ${WAREHOUSE_HOURS.replace(" - ", " до ")}.` },
];

export default function Page() {
  return (
    <TextPage title={deliveryPage.title}>
      <p className="mt-4 max-w-2xl text-muted">{deliveryPage.text}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {METHODS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl bg-white p-6 ring-1 ring-line">
            <Icon className="size-8 text-brand-600" strokeWidth={1.6} />
            <h2 className="mt-4 font-bold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-brand-50 p-6 sm:flex-row sm:items-center">
        <Building2 className="size-10 shrink-0 text-navy-800" strokeWidth={1.4} />
        <p className="flex-1 text-sm">
          Щоб укласти договір і отримати індивідуальні умови, зателефонуйте{" "}
          <a href={MAIN_PHONE.href} className="font-semibold text-brand-600">{MAIN_PHONE.label}</a> або напишіть на{" "}
          <a href={`mailto:${OFFICE.email}`} className="font-semibold text-brand-600">{OFFICE.email}</a>.
        </p>
        <Link href={PARTNER_CTA.href} className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">
          {PARTNER_CTA.label}
        </Link>
      </div>
    </TextPage>
  );
}
