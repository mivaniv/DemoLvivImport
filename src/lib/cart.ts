import "server-only";
import { db } from "@/lib/db";

// Кошик зберігається в базі (а не в браузері): клієнт бачить його з будь-якого пристрою,
// а ціни завжди беруться актуальні — на момент перегляду й оформлення.

export const MAX_QTY = 100_000;

export async function getCartCount(userId: number) {
  return db.cartItem.count({ where: { userId } });
}

export async function getCart(userId: number) {
  const rows = await db.cartItem.findMany({
    where: { userId },
    orderBy: { id: "asc" },
    include: {
      product: {
        select: {
          id: true, externalId: true, sku: true, slug: true, name: true, unit: true, unitsPerBox: true,
          minOrder: true, price: true, isActive: true, inStock: true,
          images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
    },
  });

  const lines = rows.map((r) => {
    const price = r.product.price === null ? null : Number(r.product.price);
    const available = r.product.isActive && price !== null;
    return {
      productId: r.product.id,
      externalId: r.product.externalId,
      sku: r.product.sku,
      slug: r.product.slug,
      name: r.product.name,
      unit: r.product.unit,
      unitsPerBox: r.product.unitsPerBox,
      minOrder: r.product.minOrder,
      inStock: r.product.inStock,
      image: r.product.images[0]?.url ?? null,
      quantity: r.quantity,
      price,
      // Знятий з продажу або без ціни — лишається в кошику з поясненням, але не оформлюється
      available,
      sum: available ? round2(price! * r.quantity) : 0,
    };
  });
  const orderable = lines.filter((l) => l.available);
  return { lines, total: round2(orderable.reduce((s, l) => s + l.sum, 0)), orderableCount: orderable.length };
}

export type Cart = Awaited<ReturnType<typeof getCart>>;

export const round2 = (n: number) => Math.round(n * 100) / 100;
