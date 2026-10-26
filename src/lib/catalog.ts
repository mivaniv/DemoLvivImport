import { connection } from "next/server";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { getViewer } from "@/lib/auth/session";
import { PRICE_SORTS, type CatalogState, type Collection, type SortKey } from "@/lib/catalog-params";
import { buildCategoryTree, categoryScope, type FlatCategory } from "@/lib/category-tree";
import { db } from "@/lib/db";

// Каталог читається з бази на кожен запит: після нічного імпорту зміни видно одразу.
// Ціни додаються ЛИШЕ для підтверджених клієнтів: для гостей їх немає ні в HTML, ні в даних для браузера.

const cardSelect = {
  id: true,
  externalId: true,
  sku: true,
  slug: true,
  name: true,
  netWeight: true,
  unitsPerBox: true,
  unit: true,
  minOrder: true,
  inStock: true,
  isPopular: true,
  isNew: true,
  isSale: true,
  price: true,
  oldPrice: true,
  brand: { select: { name: true, slug: true } },
  images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export function toCard(row: CardRow, canOrder: boolean) {
  const { price, oldPrice, ...rest } = row;
  return {
    ...rest,
    price: canOrder && price !== null ? Number(price) : null,
    oldPrice: canOrder && oldPrice !== null ? Number(oldPrice) : null,
  };
}

export type ProductCardData = ReturnType<typeof toCard>;

const ORDER_BY: Record<SortKey, Prisma.ProductOrderByWithRelationInput[]> = {
  default: [{ sortOrder: "asc" }],
  popular: [{ isPopular: "desc" }, { sortOrder: "asc" }],
  new: [{ createdAt: "desc" }, { sortOrder: "asc" }],
  price_asc: [{ price: { sort: "asc", nulls: "last" } }, { sortOrder: "asc" }],
  price_desc: [{ price: { sort: "desc", nulls: "last" } }, { sortOrder: "asc" }],
  name_asc: [{ name: "asc" }],
};

const COLLECTION_WHERE: Record<Collection, Prisma.ProductWhereInput> = {
  "": {},
  sale: { isSale: true },
  new: { isNew: true },
  popular: { isPopular: true },
};

type CatalogFilters = Omit<CatalogState, "view">;

// categoryIds — обрана категорія з усіма підкатегоріями (categoryScope)
function buildWhere(f: CatalogFilters, canOrder: boolean, categoryIds: number[]): Prisma.ProductWhereInput {
  const words = f.q.trim().split(/\s+/).filter(Boolean).slice(0, 8);
  return {
    isActive: true,
    ...COLLECTION_WHERE[f.collection],
    ...(f.category && { categoryId: { in: categoryIds } }),
    ...(f.brands.length > 0 && { brand: { slug: { in: f.brands } } }),
    ...(f.inStock && { inStock: true }),
    ...(f.box.length > 0 && { unitsPerBox: { in: f.box } }),
    // Фільтр за ціною діє лише для тих, хто бачить ціни
    ...(canOrder &&
      (f.priceMin !== undefined || f.priceMax !== undefined) && {
        price: { ...(f.priceMin !== undefined && { gte: f.priceMin }), ...(f.priceMax !== undefined && { lte: f.priceMax }) },
      }),
    // Кожне слово запиту має знайтися хоча б в одному з полів.
    AND: words.map((w) => ({
      OR: [
        { name: { contains: w, mode: "insensitive" } },
        { sku: { contains: w, mode: "insensitive" } },
        { barcode: { contains: w } },
        { brand: { name: { contains: w, mode: "insensitive" } } },
        { category: { name: { contains: w, mode: "insensitive" } } },
      ],
    })),
  };
}

export async function searchProducts(f: CatalogFilters) {
  await connection();
  const canOrder = (await getViewer())?.canOrder ?? false;
  const where = buildWhere(f, canOrder, f.category ? categoryScope(await getFlatCategories(), f.category) : []);
  const sort = !canOrder && PRICE_SORTS.includes(f.sort) ? "default" : f.sort;
  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      select: cardSelect,
      orderBy: ORDER_BY[sort],
      skip: (f.page - 1) * f.perPage,
      take: f.perPage * f.count,
    }),
    db.product.count({ where }),
  ]);
  return {
    items: rows.map((r) => toCard(r, canOrder)),
    total,
    pages: Math.max(1, Math.ceil(total / f.perPage)),
  };
}

// Значення «кількість у ящику» для фільтра (як на lvivimport.com)
export async function getBoxSizes(collection: Collection = "") {
  await connection();
  const rows = await db.product.groupBy({
    by: ["unitsPerBox"],
    where: { isActive: true, unitsPerBox: { not: null }, ...COLLECTION_WHERE[collection] },
    _count: true,
    orderBy: { unitsPerBox: "asc" },
  });
  return rows.map((r) => ({ value: r.unitsPerBox!, count: r._count }));
}

// Усі категорії з кількістю власних товарів; ієрархія — за ID груп 1С (parentExternalId).
// cache: каталог і фільтр у межах одного запиту читають категорії один раз.
const getFlatCategories = cache(async (): Promise<FlatCategory[]> => {
  const rows = await db.category.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      sortOrder: true,
      externalId: true,
      parentExternalId: true,
      _count: { select: { products: { where: { isActive: true } } } },
      // Перший товар категорії дає ілюстрацію для плитки на головній.
      products: {
        where: { isActive: true, images: { some: {} } },
        orderBy: [{ isPopular: "desc" }, { sortOrder: "asc" }],
        take: 1,
        select: { images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 } },
      },
    },
  });
  const idByExternal = new Map(rows.filter((r) => r.externalId).map((r) => [r.externalId!, r.id]));
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    parentId: (r.parentExternalId && idByExternal.get(r.parentExternalId)) || null,
    sortOrder: r.sortOrder,
    ownCount: r._count.products,
    image: r.products[0]?.images[0]?.url,
  }));
});

// Розділи й підкатегорії в порядку дерева; кількість товарів — разом із підкатегоріями.
export async function getCategories() {
  await connection();
  return buildCategoryTree(await getFlatCategories());
}

export async function getBrands() {
  await connection();
  return db.brand.findMany({
    where: { products: { some: { isActive: true } } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      country: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
}

// Добірка для головної. Якщо позначених товарів замало (з 1С позначки можуть не приходити),
// «Популярні» доповнюються першими товарами за порядком у вивантаженні.
export async function getCollectionProducts(collection: Exclude<Collection, "">, limit: number) {
  await connection();
  const canOrder = (await getViewer())?.canOrder ?? false;
  const rows = await db.product.findMany({
    where: { isActive: true, ...COLLECTION_WHERE[collection] },
    orderBy: ORDER_BY[collection === "new" ? "new" : "default"],
    take: limit,
    select: cardSelect,
  });
  if (collection === "popular" && rows.length < limit) {
    rows.push(
      ...(await db.product.findMany({
        where: { isActive: true, isPopular: false },
        orderBy: ORDER_BY.default,
        take: limit - rows.length,
        select: cardSelect,
      })),
    );
  }
  return rows.map((r) => toCard(r, canOrder));
}

// cache: generateMetadata і сторінка товару в одному запиті ділять один результат.
export const getProduct = cache(async (slug: string) => {
  await connection();
  const canOrder = (await getViewer())?.canOrder ?? false;
  const product = await db.product.findFirst({
    where: { slug, isActive: true },
    include: {
      brand: true,
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      attributes: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) return null;
  const { price, oldPrice, ...rest } = product;
  return {
    ...rest,
    price: canOrder && price !== null ? Number(price) : null,
    oldPrice: canOrder && oldPrice !== null ? Number(oldPrice) : null,
  };
});

// Сервер рендерить сторінки товарів на запит, тож заздалегідь нічого не генеруємо.
// Статична збірка (catalog.static.ts) повертає тут усі slug-и зі знімка.
export async function getAllProductSlugs(): Promise<string[]> {
  return [];
}

export async function getSimilarProducts(product: { id: number; categoryId: number | null }, limit = 4) {
  await connection();
  const canOrder = (await getViewer())?.canOrder ?? false;
  const rows = await db.product.findMany({
    where: { isActive: true, id: { not: product.id }, categoryId: product.categoryId },
    orderBy: [{ isPopular: "desc" }, { sortOrder: "asc" }],
    take: limit,
    select: cardSelect,
  });
  return rows.map((r) => toCard(r, canOrder));
}
