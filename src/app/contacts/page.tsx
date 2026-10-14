import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "@/components/contacts/ContactForm";
import { SocialLinks } from "@/components/layout/SocialLinks";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { COMPANY, DEPARTMENTS, HOURS, OFFICE, phoneHref, WAREHOUSE } from "@/content/company";

export const metadata: Metadata = { title: "Контакти" };

export default function ContactsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Головна", href: "/" }, { label: "Контакти" }]} />
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Контакти</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[OFFICE, WAREHOUSE].map((c) => (
          <div key={c.title} className="space-y-3 rounded-2xl bg-white p-6 ring-1 ring-line">
            <h2 className="text-lg font-bold">{c.title}:</h2>
            <a href={COMPANY.mapUrl} target="_blank" rel="noopener noreferrer" className="flex gap-2 text-sm hover:text-brand-600">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-600" /> {COMPANY.address}
            </a>
            <a href={phoneHref(c.phone)} className="flex gap-2 text-sm font-semibold hover:text-brand-600">
              <Phone className="mt-0.5 size-4 shrink-0 text-brand-600" /> {c.phone}
            </a>
            <a href={`mailto:${c.email}`} className="flex gap-2 text-sm hover:text-brand-600">
              <Mail className="mt-0.5 size-4 shrink-0 text-brand-600" /> {c.email}
            </a>
          </div>
        ))}
        <div className="space-y-3 rounded-2xl bg-navy-900 p-6 text-white">
          <h2 className="text-lg font-bold">Графік роботи:</h2>
          {HOURS.map((h) => (
            <p key={h} className="flex gap-2 text-sm text-white/85">
              <Clock className="mt-0.5 size-4 shrink-0" /> {h}
            </p>
          ))}
          <SocialLinks className="pt-2 text-white/80" />
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Команда:</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENTS.map((d) => (
            <div key={d.title} className="rounded-2xl bg-white p-5 ring-1 ring-line">
              <p className="font-semibold">{d.title}:</p>
              <a href={d.phoneHref} className="mt-2 flex items-center gap-2 text-sm hover:text-brand-600">
                <Phone className="size-4 text-brand-600" /> {d.phone}
              </a>
              <a href={`mailto:${d.email}`} className="mt-1 flex items-center gap-2 text-sm hover:text-brand-600">
                <Mail className="size-4 text-brand-600" /> {d.email}
              </a>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-bold">Як нас знайти</h2>
          <div className="mt-4 aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-line">
            <iframe
              title="Львівімпорт на мапі"
              src={COMPANY.mapEmbed}
              className="size-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
        <section>
          <h2 className="text-xl font-bold">Зворотній зв&apos;язок</h2>
          <div className="mt-4 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
            <ContactForm />
          </div>
        </section>
      </div>
    </div>
  );
}
