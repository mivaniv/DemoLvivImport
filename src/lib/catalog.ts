import { connection } from "next/server";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import type { CatalogState, SortKey } from "@/lib/catalog-params";
import { db } from "@/lib/db";

// Каталог читається з бази на кожен запит: після нічного імпорту зміни видно одразу.

const cardSelect = {
  id: true,
  externalId: true,
  slug: true,
  name: true,
  netWeight: true,
  unitsPerBox: true,
  unit: true,
  inStock: true,
  brand: { select: { name: true, slug: true } },
  images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

const ORDER_BY: Record<SortKey, Prisma.ProductOrderByWithRelationInput[]> = {
  popular: [{ isPopular: "desc" }, { sortOrder: "asc" }],
  name_asc: [{ name: "asc" }],
  name_desc: [{ name: "desc" }],
  new: [{ createdAt: "desc" }],
};

export const PAGE_SIZE = 12;

type CatalogFilters = Pick<CatalogState, "q" | "category" | "brands" | "inStock" | "sort" | "page">;

function buildWhere(f: CatalogFilters): Prisma.ProductWhereInput {
  const words = (f.q ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 8);
  return {
    isActive: true,
    ...(f.category && { category: { slug: f.category } }),
    ...(f.brands.length > 0 && { brand: { slug: { in: f.brands } } }),
    ...(f.inStock && { inStock: true }),
    // Кожне слово запиту має знайтися хоча б в одному з полів.
    AND: words.map((w) => ({
      OR: [
        { name: { contains: w, mode: "insensitive" } },
        { sku: { contains: w, mode: "insensitive" } },
        { brand: { name: { contains: w, mode: "insensitive" } } },
        { category: { name: { contains: w, mode: "insensitive" } } },
      ],
    })),
  };
}

export async function searchProducts(f: CatalogFilters) {
  await connection();
  const where = buildWhere(f);
  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      select: cardSelect,
      orderBy: ORDER_BY[f.sort],
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getCategories() {
  await connection();
  return db.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
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
}

export async function getBrands() {
  await connection();
  return db.brand.findMany({
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

export async function getPopularProducts(limit = 5) {
  await connection();
  return db.product.findMany({
    where: { isActive: true, isPopular: true },
    orderBy: { sortOrder: "asc" },
    take: limit,
    select: cardSelect,
  });
}

// cache: generateMetadata і сторінка товару в одному запиті ділять один результат.
export const getProduct = cache(async (slug: string) => {
  await connection();
  return db.product.findFirst({
    where: { slug, isActive: true },
    include: {
      brand: true,
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      attributes: { orderBy: { sortOrder: "asc" } },
    },
  });
});

export async function getSimilarProducts(product: { id: number; categoryId: number | null }, limit = 4) {
  await connection();
  return db.product.findMany({
    where: { isActive: true, id: { not: product.id }, categoryId: product.categoryId },
    orderBy: [{ isPopular: "desc" }, { sortOrder: "asc" }],
    take: limit,
    select: cardSelect,
  });
}
