import "dotenv/config";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Знімок каталогу для статичної версії сайту (GitHub Pages).
// Запускати після імпорту з 1С, потім закомітити src/data/catalog-snapshot.json.
// npm run snapshot -- --limit 50  → лише перші 50 товарів (порядок як у файлі 1С)

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > 0 ? Number.parseInt(process.argv[limitArg + 1], 10) : undefined;
if (limit !== undefined && !(limit > 0)) {
  console.error("--limit має бути додатним числом");
  process.exit(2);
}

async function main() {
  const [allCategories, allBrands, products] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true, sortOrder: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, slug: true, name: true, country: true } }),
    db.product.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      take: limit,
      select: {
        // Ціни НЕ експортуються: знімок публічний, а ціни бачать лише підтверджені клієнти.
        id: true, externalId: true, sku: true, barcode: true, slug: true, name: true, description: true, netWeight: true,
        unitsPerBox: true, unit: true, minOrder: true, inStock: true, isPopular: true, isNew: true, isSale: true,
        sortOrder: true, categoryId: true, brandId: true, createdAt: true,
        images: { orderBy: { sortOrder: "asc" }, select: { url: true, alt: true } },
        attributes: { orderBy: { sortOrder: "asc" }, select: { name: true, value: true } },
      },
    }),
  ]);

  // Фото з /media/ віддає сервер, якого на GitHub Pages немає, — копіюємо їх у public/snapshot/.
  const mediaDir = path.resolve(process.env.MEDIA_DIR ?? "./storage/media");
  const portable = products.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    images: p.images.flatMap((img) => {
      if (!img.url.startsWith("/media/")) return [img];
      const rel = img.url.slice("/media/".length);
      const from = path.join(mediaDir, rel);
      if (!existsSync(from)) return [];
      const to = path.join("public", "snapshot", rel);
      mkdirSync(path.dirname(to), { recursive: true });
      copyFileSync(from, to);
      return [{ ...img, url: `/snapshot/${rel}` }];
    }),
  }));

  // Лише категорії й бренди, що мають товари у знімку.
  const categories = allCategories.filter((c) => products.some((p) => p.categoryId === c.id));
  const brands = allBrands.filter((b) => products.some((p) => p.brandId === b.id));

  // Опубліковані відгуки (без email авторів)
  const reviews = (
    await db.review.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      select: { id: true, author: true, rating: true, text: true, reply: true, createdAt: true },
    })
  ).map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));

  const snapshot = { generatedAt: new Date().toISOString(), categories, brands, products: portable, reviews };
  writeFileSync("src/data/catalog-snapshot.json", JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`Snapshot: ${categories.length} categories, ${brands.length} brands, ${products.length} products`);
}

main().finally(() => db.$disconnect());
