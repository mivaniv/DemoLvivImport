import { CatalogView } from "@/components/catalog/CatalogView";
import { getBrands, getCategories, PAGE_SIZE, searchProducts } from "@/lib/catalog";
import { parseCatalogParams } from "@/lib/catalog-params";

// Серверний каталог: фільтрує в PostgreSQL. У статичній збірці підміняється CatalogScreen.static.tsx.
export default async function CatalogScreen(props: PageProps<"/catalog">) {
  const raw = await props.searchParams;
  const state = parseCatalogParams(raw);
  const [categories, brands, result] = await Promise.all([getCategories(), getBrands(), searchProducts(state)]);
  return (
    <CatalogView
      state={state}
      autoFocusSearch={raw.focus === "search"}
      pageSize={PAGE_SIZE}
      categories={categories}
      brands={brands}
      result={result}
    />
  );
}
