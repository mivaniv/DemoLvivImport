import { ArrowRight, BadgeCheck, Building2, Handshake, Headset, Store, Truck, Users, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HeroArt } from "@/components/home/HeroArt";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getCategories, getPopularProducts } from "@/lib/catalog";

const FEATURES = [
  { icon: BadgeCheck, label: "Оригінальні бренди" },
  { icon: Truck, label: "Стабільні постачання" },
  { icon: Handshake, label: "Партнерські умови" },
  { icon: Headset, label: "Підтримка на всіх етапах" },
];

const SEGMENTS = [
  { icon: Store, label: "Роздрібні мережі" },
  { icon: UtensilsCrossed, label: "HoReCa" },
  { icon: Building2, label: "Дистриб'ютори" },
  { icon: Users, label: "Корпоративні клієнти" },
];

export default async function HomePage() {
  const [categories, popular] = await Promise.all([getCategories(), getPopularProducts(5)]);

  return (
    <>
      <section className="overflow-hidden bg-gradient-to-b from-white to-canvas">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:pb-16 lg:pt-14">
          <div>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Ваш асортимент.
              <br />
              Одне <span className="text-brand-600">замовлення.</span>
            </h1>
            <p className="mt-5 max-w-md text-muted sm:text-lg">
              Європейські продукти від перевірених брендів для роздрібної торгівлі, HoReCa та дистриб&apos;юторів.
            </p>
            <Link
              href="/catalog"
              className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-6 font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700"
            >
              До каталогу <ArrowRight className="size-4" />
            </Link>
            <ul className="mt-10 grid max-w-lg grid-cols-2 gap-5 sm:grid-cols-4">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex flex-col gap-2 text-xs font-medium leading-snug text-muted">
                  <span className="grid size-11 place-items-center rounded-full border border-brand-100 bg-white text-brand-600">
                    <Icon className="size-5" strokeWidth={1.8} />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <HeroArt />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionHeader title="Популярні категорії" href="/catalog" linkLabel="Усі категорії" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/catalog?category=${c.slug}`}
              className="group overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-600/5"
            >
              <div className="relative aspect-[4/3] bg-gradient-to-br from-brand-50 to-white">
                {c.products[0]?.images[0] && (
                  <Image
                    src={c.products[0].images[0].url}
                    alt=""
                    fill
                    unoptimized={c.products[0].images[0].url.endsWith(".svg")}
                    sizes="(min-width: 1024px) 240px, 45vw"
                    className="object-contain p-3 transition duration-300 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-3 text-sm font-semibold">
                <span className="leading-snug">{c.name}</span>
                <ArrowRight className="size-4 shrink-0 text-brand-600 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <SectionHeader title="Популярні товари" href="/catalog" linkLabel="Усі товари" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {popular.map((p) => (
            <ProductCard key={p.id} product={p} variant="compact" />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="relative grid overflow-hidden rounded-3xl bg-gradient-to-r from-navy-900 via-navy-800 to-navy-700 text-white lg:grid-cols-[1.1fr_0.9fr_0.8fr]">
          <div className="relative z-10 p-7 sm:p-10">
            <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
              Надійний партнер
              <br />
              для вашого бізнесу
            </h2>
            <p className="mt-3 max-w-sm text-sm text-white/75">
              Гнучкі умови співпраці та індивідуальний підхід до кожного клієнта.
            </p>
            <Link
              href="/business"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold transition hover:bg-brand-500"
            >
              Для бізнесу <ArrowRight className="size-4" />
            </Link>
          </div>
          <WarehouseArt />
          <ul className="relative z-10 grid content-center gap-4 border-t border-white/10 p-7 sm:grid-cols-2 sm:p-10 lg:grid-cols-1 lg:border-l lg:border-t-0">
            {SEGMENTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm font-medium">
                <Icon className="size-5 text-brand-200" strokeWidth={1.8} />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

// Ілюстрація складу замість фото з макета: палети з коробками.
function WarehouseArt() {
  const box = (x: number, y: number, w: number, h: number, key: string) => (
    <g key={key}>
      <rect x={x} y={y} width={w} height={h} rx="3" fill="#c79a5b" />
      <rect x={x} y={y} width={w} height={h * 0.22} fill="#b0844a" />
      <rect x={x + w / 2 - 5} y={y} width="10" height={h} fill="#e0bf84" opacity=".7" />
    </g>
  );
  return (
    <div className="relative hidden items-end justify-center lg:flex">
      <svg viewBox="0 0 320 220" className="h-full max-h-64 w-full" aria-hidden="true">
        <rect x="0" y="200" width="320" height="20" fill="#0a1a40" opacity=".5" />
        {[40, 170].map((px) => (
          <g key={px}>
            <rect x={px} y="188" width="110" height="12" fill="#8a6a3d" />
            {box(px, 140, 54, 48, `${px}a`)}
            {box(px + 56, 140, 54, 48, `${px}b`)}
            {box(px + 10, 92, 54, 48, `${px}c`)}
            {px === 40 && box(px + 28, 44, 54, 48, `${px}d`)}
          </g>
        ))}
        <circle cx="270" cy="40" r="22" fill="#2f6bf0" opacity=".35" />
        <circle cx="290" cy="70" r="10" fill="#f5b82e" opacity=".8" />
      </svg>
    </div>
  );
}
