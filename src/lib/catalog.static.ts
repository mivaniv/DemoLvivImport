import snapshot from "@/data/catalog-snapshot.json";
import type { CatalogState, SortKey } from "@/lib/catalog-params";

// Каталог для статичної збірки (GitHub Pages): ті самі функції, що й у catalog.ts,
// але дані — зі знімка бази, а пошук і фільтри виконуються в JS (зокрема в браузері).

type SnapshotProduct = (typeof snapshot.products)[number];

export const PAGE_SIZE = 12;

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
    inStock: p.inStock,
    brand: brand ? { name: brand.name, slug: brand.slug } : null,
    images: p.images.slice(0, 1),
  };
}

export type ProductCardData = ReturnType<typeof toCard>;

const collator = new Intl.Collator("uk");
const COMPARE: Record<SortKey, (a: SnapshotProduct, b: SnapshotProduct) => number> = {
  popular: (a, b) => Number(b.isPopular) - Number(a.isPopular) || a.sortOrder - b.sortOrder,
  name_asc: (a, b) => collator.compare(a.name, b.name),
  name_desc: (a, b) => collator.compare(b.name, a.name),
  new: (a, b) => b.createdAt.localeCompare(a.createdAt),
};

// Та сама логіка, що й buildWhere у catalog.ts: кожне слово запиту має знайтися хоча б в одному полі.
export function querySnapshot(f: Pick<CatalogState, "q" | "category" | "brands" | "inStock" | "sort" | "page">) {
  const words = f.q.toLocaleLowerCase("uk").trim().split(/\s+/).filter(Boolean).slice(0, 8);
  const matches = snapshot.products
    .filter((p) => {
      const category = p.categoryId ? categoryById.get(p.categoryId) : undefined;
      const brand = p.brandId ? brandById.get(p.brandId) : undefined;
      if (f.category && category?.slug !== f.category) return false;
      if (f.brands.length && (!brand || !f.brands.includes(brand.slug))) return false;
      if (f.inStock && !p.inStock) return false;
      const haystack = [p.name, p.sku, brand?.name, category?.name].filter(Boolean).join(" ").toLocaleLowerCase("uk");
      return words.every((w) => haystack.includes(w));
    })
    .sort(COMPARE[f.sort]);

  return {
    items: matches.slice((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE).map(toCard),
    total: matches.length,
    pages: Math.max(1, Math.ceil(matches.length / PAGE_SIZE)),
  };
}

export async function searchProducts(f: Parameters<typeof querySnapshot>[0]) {
  return querySnapshot(f);
}

export function getCategoriesSync() {
  return snapshot.categories.map((c) => {
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

export async function getPopularProducts(limit = 5) {
  return snapshot.products.filter((p) => p.isPopular).slice(0, limit).map(toCard);
}

export async function getProduct(slug: string) {
  const p = snapshot.products.find((x) => x.slug === slug);
  if (!p) return null;
  return {
    ...p,
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

export function getAllProductSlugs() {
  return snapshot.products.map((p) => p.slug);
}
