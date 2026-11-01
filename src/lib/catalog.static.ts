import snapshot from "@/data/catalog-snapshot.json";
import {
  boxSizes,
  brandsWithCounts,
  cardOf,
  type CatalogFilters,
  categoryTree,
  collectionProducts,
  findProduct,
  queryCatalog,
  similarProducts,
} from "@/lib/catalog-data";
import type { Collection } from "@/lib/catalog-params";

// Каталог для статичної збірки: ті самі функції, що й у catalog.ts, але дані — зі знімка бази
// (src/data/catalog-snapshot.json). Цін у знімку немає: у статичній версії кожен відвідувач — гість.
// Сторінки рендеряться з нього під час збірки, а в браузері каталог, головна й товари беруть
// свіжі дані з /data/products.json (useCatalogData) — на хостингу їх щодня оновлює крон.

export type ProductCardData = ReturnType<typeof cardOf>;

export async function searchProducts(f: CatalogFilters) {
  return queryCatalog(snapshot, f);
}

export async function getBoxSizes(collection: Collection = "") {
  return boxSizes(snapshot, collection);
}

export async function getCategories() {
  return categoryTree(snapshot);
}

export async function getBrands() {
  return brandsWithCounts(snapshot);
}

export async function getCollectionProducts(collection: Exclude<Collection, "">, limit: number) {
  return collectionProducts(snapshot, collection, limit);
}

export async function getProduct(slug: string) {
  return findProduct(snapshot, slug);
}

export async function getSimilarProducts(product: { id: number; categoryId: number | null }, limit = 4) {
  return similarProducts(snapshot, product, limit);
}

export async function getAllProductSlugs() {
  return snapshot.products.map((p) => p.slug);
}
