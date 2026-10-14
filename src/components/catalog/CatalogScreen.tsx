import { CatalogView } from "@/components/catalog/CatalogView";
import { getViewer } from "@/lib/auth/session";
import { getBoxSizes, getBrands, getCategories, searchProducts } from "@/lib/catalog";
import { parseCatalogParams, type Collection } from "@/lib/catalog-params";

// Серверний каталог: фільтрує в PostgreSQL. У статичній збірці підміняється CatalogScreen.static.tsx.
// catalogPage(collection) створює сторінку для /catalog, /promo, /new-products, /popular.
export function catalogPage(collection: Collection = "") {
  return async function CatalogPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const raw = await props.searchParams;
    const state = parseCatalogParams(raw, collection);
    const [viewer, categories, brands, boxSizes, result] = await Promise.all([
      getViewer(),
      getCategories(),
      getBrands(),
      getBoxSizes(collection),
      searchProducts(state),
    ]);
    return (
      <CatalogView
        state={state}
        canOrder={viewer?.canOrder ?? false}
        autoFocusSearch={raw.focus === "search"}
        categories={categories}
        brands={brands}
        boxSizes={boxSizes}
        result={result}
      />
    );
  };
}
