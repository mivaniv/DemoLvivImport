import type snapshot from "@/data/catalog-snapshot.json";
import type { CatalogState, Collection, SortKey } from "@/lib/catalog-params";
import { buildCategoryTree, categoryScope, type FlatCategory } from "@/lib/category-tree";

// Каталог статичної версії — чисті функції над даними, без імпорту самого знімка:
// ними користуються і збірка (catalog.static.ts над знімком), і браузер (каталог, головна,
// шаблон товару), який бере свіжі дані з /data/products.json — на хостингу їх щодня оновлює крон.
// Логіка та сама, що в catalog.ts для бази.

export type CatalogData = Pick<typeof snapshot, "categories" | "brands" | "products">;
export type SnapshotProduct = CatalogData["products"][number];

type Index = {
  brandById: Map<number, CatalogData["brands"][number]>;
  categoryById: Map<number, CatalogData["categories"][number]>;
};
const indexes = new WeakMap<CatalogData, Index>();

function indexOf(data: CatalogData) {
  let index = indexes.get(data);
  if (!index) {
    index = {
      brandById: new Map(data.brands.map((b) => [b.id, b])),
      categoryById: new Map(data.categories.map((c) => [c.id, c])),
    };
    indexes.set(data, index);
  }
  return index;
}

export function cardOf(data: CatalogData, p: SnapshotProduct) {
  const brand = p.brandId ? indexOf(data).brandById.get(p.brandId) : undefined;
  return {
    id: p.id,
    externalId: p.externalId,
    sku: p.sku,
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

export type CatalogFilters = Omit<CatalogState, "view">;

// Та сама логіка, що й buildWhere у catalog.ts: кожне слово запиту має знайтися хоча б в одному полі.
export function queryCatalog(data: CatalogData, f: CatalogFilters) {
  const { brandById, categoryById } = indexOf(data);
  const words = f.q.toLocaleLowerCase("uk").trim().split(/\s+/).filter(Boolean).slice(0, 8);
  const scope = f.category ? new Set(categoryScope(flatCategories(data), f.category)) : null;
  const matches = data.products
    .filter((p) => {
      const category = p.categoryId ? categoryById.get(p.categoryId) : undefined;
      const brand = p.brandId ? brandById.get(p.brandId) : undefined;
      if (!IN_COLLECTION[f.collection](p)) return false;
      if (scope && (p.categoryId === null || !scope.has(p.categoryId))) return false;
      if (f.brands.length && (!brand || !f.brands.includes(brand.slug))) return false;
      if (f.inStock && !p.inStock) return false;
      if (f.box.length && (p.unitsPerBox === null || !f.box.includes(p.unitsPerBox))) return false;
      const haystack = [p.name, p.sku, p.barcode, brand?.name, category?.name].filter(Boolean).join(" ").toLocaleLowerCase("uk");
      return words.every((w) => haystack.includes(w));
    })
    .sort(COMPARE[f.sort]);

  return {
    items: matches.slice((f.page - 1) * f.perPage, (f.page - 1 + f.count) * f.perPage).map((p) => cardOf(data, p)),
    total: matches.length,
    pages: Math.max(1, Math.ceil(matches.length / f.perPage)),
  };
}

export function boxSizes(data: CatalogData, collection: Collection = "") {
  const counts = new Map<number, number>();
  for (const p of data.products) {
    if (p.unitsPerBox !== null && IN_COLLECTION[collection](p)) counts.set(p.unitsPerBox, (counts.get(p.unitsPerBox) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => a[0] - b[0]).map(([value, count]) => ({ value, count }));
}

// Як getFlatCategories у catalog.ts
function flatCategories(data: CatalogData): FlatCategory[] {
  return data.categories.map((c) => {
    const products = data.products.filter((p) => p.categoryId === c.id).sort(COMPARE.popular);
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      parentId: (c as { parentId?: number | null }).parentId ?? null,
      sortOrder: c.sortOrder,
      ownCount: products.length,
      image: products.find((p) => p.images.length > 0)?.images[0].url,
    };
  });
}

export function categoryTree(data: CatalogData) {
  return buildCategoryTree(flatCategories(data));
}

export function brandsWithCounts(data: CatalogData) {
  return data.brands.map((b) => ({
    ...b,
    _count: { products: data.products.filter((p) => p.brandId === b.id).length },
  }));
}

// Як у catalog.ts: «Популярні» доповнюються першими товарами, якщо позначених замало.
export function collectionProducts(data: CatalogData, collection: Exclude<Collection, "">, limit: number) {
  const picked = data.products.filter(IN_COLLECTION[collection]).sort(COMPARE[collection === "new" ? "new" : "default"]);
  if (collection === "popular" && picked.length < limit) {
    picked.push(...data.products.filter((p) => !p.isPopular).sort(COMPARE.default));
  }
  return picked.slice(0, limit).map((p) => cardOf(data, p));
}

export function findProduct(data: CatalogData, slug: string) {
  const p = data.products.find((x) => x.slug === slug);
  if (!p) return null;
  const { brandById, categoryById } = indexOf(data);
  return {
    ...p,
    price: null as number | null,
    oldPrice: null as number | null,
    brand: p.brandId ? brandById.get(p.brandId) ?? null : null,
    category: p.categoryId ? categoryById.get(p.categoryId) ?? null : null,
  };
}

// Як у повній версії: та сама категорія, спершу популярні
export function similarProducts(data: CatalogData, product: { id: number; categoryId: number | null }, limit = 4) {
  return data.products
    .filter((p) => p.id !== product.id && p.categoryId === product.categoryId)
    .sort(COMPARE.popular)
    .slice(0, limit)
    .map((p) => cardOf(data, p));
}
