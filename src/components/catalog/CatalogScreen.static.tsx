import { Suspense } from "react";
import { ClientCatalog } from "@/components/catalog/ClientCatalog";
import type { Collection } from "@/lib/catalog-params";

// Статична версія: сторінка не читає searchParams на збірці (їх немає), фільтрує браузер.
// useSearchParams у статичному експорті вимагає межі Suspense.
export function catalogPage(collection: Collection = "") {
  return function CatalogPage() {
    return (
      <Suspense fallback={<div className="mx-auto h-[60vh] max-w-7xl px-4 sm:px-6" />}>
        <ClientCatalog collection={collection} />
      </Suspense>
    );
  };
}
