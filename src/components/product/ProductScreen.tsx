"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import NotFound from "@/app/not-found";
import { ProductDetails } from "@/components/product/ProductDetails";
import { asset } from "@/lib/asset";
import { type CatalogData, findProduct, similarProducts } from "@/lib/product-data";

// Шаблон сторінки товару статичної збірки: хостинг віддає той самий product/index.html на будь-яку
// адресу /product/<slug>/ (.htaccess), а товар береться з /data/products.json. Так сайт — кілька
// десятків сторінок замість окремої на кожен товар, і правка футера заливається за хвилини.

let catalog: Promise<CatalogData> | undefined;

function loadCatalog() {
  // no-cache: браузер перепитує сервер (304, якщо файл не змінився), тож новий імпорт видно одразу
  catalog ??= fetch(asset("/data/products.json"), { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<CatalogData>;
  });
  catalog.catch(() => (catalog = undefined)); // наступна спроба — заново
  return catalog;
}

const TITLE = "%s — Lviv Import"; // як metadata.title.template в app/layout.tsx

export function ProductScreen() {
  const pathname = usePathname();
  const [, section, rawSlug] = pathname.split("/");
  const slug = section === "product" && rawSlug ? decodeURIComponent(rawSlug) : "";
  const [state, setState] = useState<{ data: CatalogData } | { error: true } | null>(null);

  useEffect(() => {
    let active = true;
    loadCatalog().then(
      (data) => active && setState({ data }),
      () => active && setState({ error: true }),
    );
    return () => {
      active = false;
    };
  }, []);

  const product = state && "data" in state && slug ? findProduct(state.data, slug) : null;

  useEffect(() => {
    if (product) document.title = TITLE.replace("%s", product.name);
  }, [product]);

  if (!state) return <ProductSkeleton />;
  if ("error" in state) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Не вдалося завантажити товар</h1>
        <p className="mt-2 text-muted">Перевірте з&apos;єднання з інтернетом і оновіть сторінку.</p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="mt-8 inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white"
        >
          Оновити
        </button>
      </div>
    );
  }
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
