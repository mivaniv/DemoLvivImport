"use client";

import { useSearchParams } from "next/navigation";
import { CatalogView } from "@/components/catalog/CatalogView";
import { parseCatalogParams } from "@/lib/catalog-params";
import { getBrandsSync, getCategoriesSync, PAGE_SIZE, querySnapshot } from "@/lib/catalog.static";

export function ClientCatalog() {
  const params = useSearchParams();
  const raw = Object.fromEntries(params.entries());
  const state = parseCatalogParams(raw);
  return (
    <CatalogView
      state={state}
      autoFocusSearch={raw.focus === "search"}
      pageSize={PAGE_SIZE}
      categories={getCategoriesSync()}
      brands={getBrandsSync()}
      result={querySnapshot(state)}
    />
  );
}
