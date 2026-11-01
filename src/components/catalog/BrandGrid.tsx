"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCatalogData } from "@/components/catalog/useCatalogData";
import { brandsWithCounts } from "@/lib/catalog-data";

type Brand = { id: number; slug: string; name: string; country: string | null; _count: { products: number } };

// Бренди з кількістю товарів: з даних сторінки, а в статичній версії — свіжі з /data/products.json
export function BrandGrid({ brands }: { brands: Brand[] }) {
  const catalog = useCatalogData();
  const items = catalog && "data" in catalog ? brandsWithCounts(catalog.data) : brands;
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((b) => (
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
  );
}
