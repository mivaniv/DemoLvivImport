import { Suspense } from "react";
import { CatalogSkeleton, ClientCatalog } from "@/components/catalog/ClientCatalog";
import type { Collection } from "@/lib/catalog-params";

// Статична версія: сторінка не читає searchParams на збірці (їх немає), фільтрує браузер.
// useSearchParams у статичному експорті вимагає межі Suspense.
export function catalogPage(collection: Collection = "") {
  return function CatalogPage() {
    return (
      <Suspense fallback={<CatalogSkeleton />}>
        <ClientCatalog collection={collection} />
      </Suspense>
    );
  };
}
