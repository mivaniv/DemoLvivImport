"use client";

import { useSearchParams } from "next/navigation";
import { CatalogLoadError } from "@/components/catalog/CatalogLoadError";
import { CatalogView } from "@/components/catalog/CatalogView";
import { useCatalogData } from "@/components/catalog/useCatalogData";
import { boxSizes, brandsWithCounts, categoryTree, queryCatalog } from "@/lib/catalog-data";
import { parseCatalogParams, type Collection } from "@/lib/catalog-params";

// Каталог статичної версії: фільтри й пошук виконує браузер над свіжими даними з /data/products.json
export function ClientCatalog({ collection }: { collection: Collection }) {
  const params = useSearchParams();
  const catalog = useCatalogData();
  if (!catalog) return <CatalogSkeleton />;
  if ("error" in catalog) return <CatalogLoadError title="Не вдалося завантажити каталог" />;

  const raw = Object.fromEntries(params.entries());
  const state = parseCatalogParams(raw, collection);
  return (
    <CatalogView
      state={state}
      canOrder={false}
      autoFocusSearch={raw.focus === "search"}
      categories={categoryTree(catalog.data)}
      brands={brandsWithCounts(catalog.data)}
      boxSizes={boxSizes(catalog.data, collection)}
      result={queryCatalog(catalog.data, state)}
    />
  );
}

export function CatalogSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-6 sm:px-6" aria-busy="true" aria-label="Завантаження каталогу">
      <div className="h-4 w-48 rounded bg-line" />
      <div className="mt-4 h-9 w-64 rounded bg-line" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="hidden h-96 rounded-2xl bg-line/60 lg:block" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-line/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
