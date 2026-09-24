import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getBrands } from "@/lib/catalog";

export const metadata: Metadata = { title: "Бренди" };

export default async function BrandsPage() {
  const brands = await getBrands();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Головна", href: "/" }, { label: "Бренди" }]} />
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Бренди</h1>
      <p className="mt-2 max-w-2xl text-muted">Працюємо напряму з європейськими виробниками та офіційними постачальниками.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {brands.map((b) => (
          <Link
            key={b.id}
            href={`/catalog?brand=${b.slug}`}
            className="group rounded-2xl border border-line bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-600/5"
          >
            <p className="font-serif text-2xl font-bold tracking-wide text-navy-800">{b.name}</p>
            {b.country && <p className="mt-1 text-sm text-muted">{b.country}</p>}
            <p className="mt-6 flex items-center justify-between text-sm font-semibold text-brand-600">
              {b._count.products} товарів
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
