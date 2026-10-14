import { HeartHandshake, Lightbulb, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FleetVideo, LanguageVideo } from "@/components/about/CompanyVideo";
import { ContactForm } from "@/components/contacts/ContactForm";
import { LogoMarquee } from "@/components/home/LogoMarquee";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ABOUT, BRAND_LOGOS, CLIENTS, GALLERY, HOURS, MAIN_PHONE, OFFICE } from "@/content/company";
import { asset } from "@/lib/asset";
import { B2B_ENABLED } from "@/lib/features";

export const metadata: Metadata = { title: "Про нас" };

const VALUE_ICONS = [HeartHandshake, ShieldCheck, Lightbulb, Users];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Головна", href: "/" }, { label: "Про нас" }]} />
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Про нас</h1>

      {/* Порядок блоків — як на lvivimport.com/about */}
      <section className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_1.1fr]">
        <p className="leading-relaxed text-ink/85 lg:pt-12">{ABOUT.intro[0]}</p>
        <LanguageVideo poster={asset(GALLERY[0])} />
      </section>

      <section className="mt-10 grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
        <FleetVideo poster={asset(GALLERY[8])} />
        <div className="space-y-4 leading-relaxed text-ink/85">
          <p>{ABOUT.intro[1]}</p>
          <p>{ABOUT.intro[2]}</p>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-bold sm:text-2xl">Наші клієнти</h2>
        <div className="mt-3 max-w-3xl space-y-3 text-sm leading-relaxed text-ink/80">
          {ABOUT.clients.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
        <div className="mt-6">
          <LogoMarquee logos={CLIENTS} />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-bold sm:text-2xl">Ми імпортуємо торгові марки</h2>
        <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
          {BRAND_LOGOS.map((b) => (
            <li key={b.src} className="grid h-20 place-items-center rounded-xl bg-white px-3 ring-1 ring-line">
              {/* eslint-disable-next-line @next/next/no-img-element -- логотипи різних форматів */}
              <img src={asset(b.src)} alt={b.name} loading="lazy" className="max-h-12 max-w-full object-contain" />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-2">
        {ABOUT.values.map((v, i) => {
          const Icon = VALUE_ICONS[i];
          return (
            <div key={v.title} className="rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
              <Icon className="size-9 text-brand-600" strokeWidth={1.5} />
              <h2 className="mt-4 text-lg font-bold">{v.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/80">{v.text}</p>
            </div>
          );
        })}
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-bold sm:text-2xl">Галерея</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GALLERY.map((src, i) => (
            <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image src={asset(src)} alt={`Львівімпорт — фото ${i + 1}`} fill sizes="(min-width: 640px) 33vw, 50vw" className="object-cover transition duration-500 hover:scale-105" />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="h-fit space-y-4 rounded-3xl bg-gradient-to-br from-navy-900 to-navy-700 p-8 text-white">
          <h2 className="text-2xl font-bold">Зв&apos;язатися з нами</h2>
          <p className="text-sm text-white/75">Розкажемо про умови співпраці та підберемо асортимент під ваш бізнес.</p>
          <p>
            <a href={MAIN_PHONE.href} className="text-lg font-bold hover:text-gold">{MAIN_PHONE.label}</a>
            <br />
            <a href={`mailto:${OFFICE.email}`} className="text-sm text-white/80 hover:text-white">{OFFICE.email}</a>
          </p>
          <ul className="text-sm text-white/75">
            {HOURS.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          {B2B_ENABLED && (
            <Link href="/account/register" className="inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 text-sm font-semibold hover:bg-brand-500">
              Стати клієнтом
            </Link>
          )}
        </div>
        <div className="rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
