"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import NotFound from "@/app/not-found";
import { CatalogLoadError } from "@/components/catalog/CatalogLoadError";
import { useCatalogData } from "@/components/catalog/useCatalogData";
import { ProductDetails } from "@/components/product/ProductDetails";
import { findProduct, similarProducts } from "@/lib/catalog-data";

// Шаблон сторінки товару статичної збірки: хостинг віддає той самий product/index.html на будь-яку
// адресу /product/<slug>/ (.htaccess), а товар береться з /data/products.json (useCatalogData).
// Так сайт — кілька десятків сторінок замість окремої на кожен товар, і правка футера заливається за хвилини.

const TITLE = "%s — Lviv Import"; // як metadata.title.template в app/layout.tsx

export function ProductScreen() {
  const pathname = usePathname();
  const [, section, rawSlug] = pathname.split("/");
  const slug = section === "product" && rawSlug ? decodeURIComponent(rawSlug) : "";
  const state = useCatalogData();

  const product = state && "data" in state && slug ? findProduct(state.data, slug) : null;

  useEffect(() => {
    if (product) document.title = TITLE.replace("%s", product.name);
  }, [product]);

  if (!state) return <ProductSkeleton />;
  if ("error" in state) return <CatalogLoadError title="Не вдалося завантажити товар" />;
  if (!product) return <NotFound />;

  return <ProductDetails product={product} similar={similarProducts(state.data, product)} viewer={null} />;
}

function ProductSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-6 sm:px-6" aria-busy="true" aria-label="Завантаження товару">
      <div className="h-4 w-64 rounded bg-line" />
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:gap-8">
        <div className="aspect-square rounded-2xl bg-line/60" />
        <div className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-7">
          <div className="h-8 w-4/5 rounded bg-line" />
          <div className="h-4 w-1/2 rounded bg-line" />
          <div className="h-16 rounded bg-line/60" />
          <div className="h-12 rounded-xl bg-line" />
        </div>
      </div>
    </div>
  );
}
