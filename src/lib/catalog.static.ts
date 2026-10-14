import snapshot from "@/data/catalog-snapshot.json";
import type { CatalogState, Collection, SortKey } from "@/lib/catalog-params";

// Каталог для статичної збірки (GitHub Pages): ті самі функції, що й у catalog.ts,
// але дані — зі знімка бази, а пошук і фільтри виконуються в JS (зокрема в браузері).
// Цін у знімку немає: на GitHub Pages кожен відвідувач — гість.

type SnapshotProduct = (typeof snapshot.products)[number];

const categoryById = new Map(snapshot.categories.map((c) => [c.id, c]));
const brandById = new Map(snapshot.brands.map((b) => [b.id, b]));

function toCard(p: SnapshotProduct) {
  const brand = p.brandId ? brandById.get(p.brandId) : undefined;
  return {
    id: p.id,
    externalId: p.externalId,
    slug: p.slug,
    name: p.name,
    netWeight: p.netWeight,
    unitsPerBox: p.unitsPerBox,
    unit: p.unit,
    minOrder: p.minOrder,
    inStock: p.inStock,
    isPopular: p.isPopular,
    isNew: p.isNew,
    isSale: p.isSale,
    price: null as number | null,
    oldPrice: null as number | null,
    brand: brand ? { name: brand.name, slug: brand.slug } : null,
    images: p.images.slice(0, 1),
  };
}

export type ProductCardData = ReturnType<typeof toCard>;

const collator = new Intl.Collator("uk");
const COMPARE: Record<SortKey, (a: SnapshotProduct, b: SnapshotProduct) => number> = {
  default: (a, b) => a.sortOrder - b.sortOrder,
  popular: (a, b) => Number(b.isPopular) - Number(a.isPopular) || a.sortOrder - b.sortOrder,
  new: (a, b) => b.createdAt.localeCompare(a.createdAt) || a.sortOrder - b.sortOrder,
  // цін немає — сортування за ціною зводиться до типового
  price_asc: (a, b) => a.sortOrder - b.sortOrder,
  price_desc: (a, b) => a.sortOrder - b.sortOrder,
  name_asc: (a, b) => collator.compare(a.name, b.name),
};

const IN_COLLECTION: Record<Collection, (p: SnapshotProduct) => boolean> = {
  "": () => true,
  sale: (p) => p.isSale,
  new: (p) => p.isNew,
  popular: (p) => p.isPopular,
};

type CatalogFilters = Omit<CatalogState, "view">;

// Та сама логіка, що й buildWhere у catalog.ts: кожне слово запиту має знайтися хоча б в одному полі.
export function querySnapshot(f: CatalogFilters) {
  const words = f.q.toLocaleLowerCase("uk").trim().split(/\s+/).filter(Boolean).slice(0, 8);
  const matches = snapshot.products
    .filter((p) => {
      const category = p.categoryId ? categoryById.get(p.categoryId) : undefined;
      const brand = p.brandId ? brandById.get(p.brandId) : undefined;
      if (!IN_COLLECTION[f.collection](p)) return false;
      if (f.category && category?.slug !== f.category) return false;
      if (f.brands.length && (!brand || !f.brands.includes(brand.slug))) return false;
      if (f.inStock && !p.inStock) return false;
      if (f.box.length && (p.unitsPerBox === null || !f.box.includes(p.unitsPerBox))) return false;
      const haystack = [p.name, p.sku, p.barcode, brand?.name, category?.name].filter(Boolean).join(" ").toLocaleLowerCase("uk");
      return words.every((w) => haystack.includes(w));
    })
    .sort(COMPARE[f.sort]);

  return {
    items: matches.slice((f.page - 1) * f.perPage, (f.page - 1 + f.count) * f.perPage).map(toCard),
    total: matches.length,
    pages: Math.max(1, Math.ceil(matches.length / f.perPage)),
  };
}

export async function searchProducts(f: CatalogFilters) {
  return querySnapshot(f);
}

export function getBoxSizesSync(collection: Collection = "") {
  const counts = new Map<number, number>();
  for (const p of snapshot.products) {
    if (p.unitsPerBox !== null && IN_COLLECTION[collection](p)) counts.set(p.unitsPerBox, (counts.get(p.unitsPerBox) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => a[0] - b[0]).map(([value, count]) => ({ value, count }));
}

export async function getBoxSizes(collection: Collection = "") {
  return getBoxSizesSync(collection);
}

export function getCategoriesSync() {
  return snapshot.categories
    .filter((c) => snapshot.products.some((p) => p.categoryId === c.id))
    .map((c) => {
      const products = snapshot.products.filter((p) => p.categoryId === c.id).sort(COMPARE.popular);
      const withImage = products.find((p) => p.images.length > 0);
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        _count: { products: products.length },
        products: withImage ? [{ images: withImage.images.slice(0, 1).map(({ url }) => ({ url })) }] : [],
      };
    });
}

export async function getCategories() {
  return getCategoriesSync();
}

export function getBrandsSync() {
  return snapshot.brands.map((b) => ({
    ...b,
    _count: { products: snapshot.products.filter((p) => p.brandId === b.id).length },
  }));
}

export async function getBrands() {
  return getBrandsSync();
}

// Як у catalog.ts: «Популярні» доповнюються першими товарами, якщо позначених замало.
export async function getCollectionProducts(collection: Exclude<Collection, "">, limit: number) {
  const picked = snapshot.products.filter(IN_COLLECTION[collection]).sort(COMPARE[collection === "new" ? "new" : "default"]);
  if (collection === "popular" && picked.length < limit) {
    picked.push(...snapshot.products.filter((p) => !p.isPopular).sort(COMPARE.default));
  }
  return picked.slice(0, limit).map(toCard);
}

export async function getProduct(slug: string) {
  const p = snapshot.products.find((x) => x.slug === slug);
  if (!p) return null;
  return {
    ...p,
    price: null as number | null,
    oldPrice: null as number | null,
    brand: p.brandId ? brandById.get(p.brandId) ?? null : null,
    category: p.categoryId ? categoryById.get(p.categoryId) ?? null : null,
  };
}

export async function getSimilarProducts(product: { id: number; categoryId: number | null }, limit = 4) {
  return snapshot.products
    .filter((p) => p.id !== product.id && p.categoryId === product.categoryId)
    .sort(COMPARE.popular)
    .slice(0, limit)
    .map(toCard);
}

export async function getAllProductSlugs() {
  return snapshot.products.map((p) => p.slug);
}
