"use client";

import { useSearchParams } from "next/navigation";
import { CatalogView } from "@/components/catalog/CatalogView";
import { parseCatalogParams, type Collection } from "@/lib/catalog-params";
import { getBoxSizesSync, getBrandsSync, getCategoriesSync, querySnapshot } from "@/lib/catalog.static";

export function ClientCatalog({ collection }: { collection: Collection }) {
  const params = useSearchParams();
  const raw = Object.fromEntries(params.entries());
  const state = parseCatalogParams(raw, collection);
  return (
    <CatalogView
      state={state}
      canOrder={false}
      autoFocusSearch={raw.focus === "search"}
      categories={getCategoriesSync()}
      brands={getBrandsSync()}
      boxSizes={getBoxSizesSync(collection)}
      result={querySnapshot(state)}
    />
  );
}
