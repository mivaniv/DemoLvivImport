"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCatalogData } from "@/components/catalog/useCatalogData";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { asset } from "@/lib/asset";
import type { ProductCardData } from "@/lib/catalog";
import { categoryTree, collectionProducts } from "@/lib/catalog-data";
import type { CategoryNode } from "@/lib/category-tree";

// Добірки й категорії головної. Рендеряться з даних сторінки (сервер чи знімок на збірці),
// а в статичній версії після завантаження замінюються свіжими з /data/products.json.

type RowProps = {
  title: string;
  href: string;
  collection: "popular" | "new" | "sale";
  limit: number;
  products: ProductCardData[];
  canOrder: boolean;
};

export function ProductRow({ title, href, collection, limit, products, canOrder }: RowProps) {
  const catalog = useCatalogData();
  const items = catalog && "data" in catalog ? collectionProducts(catalog.data, collection, limit) : products;
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <SectionHeader title={title} href={href} linkLabel="Дивитися всі" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} variant="compact" canOrder={canOrder} />
        ))}
      </div>
    </section>
  );
}

export function CategoryTiles({ categories }: { categories: CategoryNode[] }) {
  const catalog = useCatalogData();
  const items = catalog && "data" in catalog ? categoryTree(catalog.data) : categories;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {items.filter((c) => c.depth === 0).map((c) => (
        <Link
          key={c.id}
          href={`/catalog?category=${c.slug}`}
          className="group overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-600/5"
        >
          <div className="relative aspect-[4/3] bg-gradient-to-br from-brand-50 to-white">
            {c.products[0]?.images[0] && (
              <Image
                src={asset(c.products[0].images[0].url)}
                alt=""
                fill
                unoptimized={/\.svg$|^https?:\/\//.test(c.products[0].images[0].url)}
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
  );
}
