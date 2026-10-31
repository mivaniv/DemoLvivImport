import type snapshot from "@/data/catalog-snapshot.json";

// Дані каталогу статичної збірки (знімок бази) і функції над ними без імпорту самого знімка:
// ними користуються і збірка (catalog.static.ts), і браузер (шаблон сторінки товару, який
// завантажує ті самі дані з /data/products.json), тож знімок не потрапляє в JS-бандл.

export type CatalogData = Pick<typeof snapshot, "categories" | "brands" | "products">;
export type SnapshotProduct = CatalogData["products"][number];

const indexes = new WeakMap<CatalogData, { brandById: Map<number, CatalogData["brands"][number]>; categoryById: Map<number, CatalogData["categories"][number]> }>();

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
    .sort((a, b) => Number(b.isPopular) - Number(a.isPopular) || a.sortOrder - b.sortOrder)
    .slice(0, limit)
    .map((p) => cardOf(data, p));
}
