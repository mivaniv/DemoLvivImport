import "dotenv/config";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Знімок каталогу для статичної версії сайту (GitHub Pages).
// Запускати після імпорту з 1С, потім закомітити src/data/catalog-snapshot.json.

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const [categories, brands, products] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true, sortOrder: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, slug: true, name: true, country: true } }),
    db.product.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true, externalId: true, sku: true, slug: true, name: true, description: true, netWeight: true,
        unitsPerBox: true, unit: true, inStock: true, isPopular: true, sortOrder: true, categoryId: true, brandId: true,
        createdAt: true,
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

  const snapshot = { generatedAt: new Date().toISOString(), categories, brands, products: portable };
  writeFileSync("src/data/catalog-snapshot.json", JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`Snapshot: ${categories.length} categories, ${brands.length} brands, ${products.length} products`);
}

main().finally(() => db.$disconnect());
