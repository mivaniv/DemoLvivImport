import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { renderPackshot } from "../src/lib/packshots";
import { slugify } from "../src/lib/slug";
import { brands, categories, products } from "./demo-data";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const IMAGE_DIR = path.join(process.cwd(), "public", "demo", "products");

async function main() {
  mkdirSync(IMAGE_DIR, { recursive: true });

  const categoryIds = new Map<string, number>();
  for (const c of categories) {
    const row = await db.category.upsert({ where: { externalId: c.externalId }, create: c, update: c });
    categoryIds.set(c.externalId, row.id);
  }

  const brandIds = new Map<string, number>();
  for (const b of brands) {
    const row = await db.brand.upsert({ where: { externalId: b.externalId }, create: b, update: b });
    brandIds.set(b.externalId, row.id);
  }

  for (const [index, p] of products.entries()) {
    const slug = slugify(p.name);
    writeFileSync(path.join(IMAGE_DIR, `${slug}.svg`), renderPackshot(p.packshot));

    const data = {
      sku: p.sku,
      slug,
      name: p.name,
      description: p.description,
      netWeight: p.netWeight,
      unitsPerBox: p.unitsPerBox,
      inStock: p.inStock,
      isPopular: p.isPopular ?? false,
      isActive: true,
      sortOrder: index,
      categoryId: categoryIds.get(p.category)!,
      brandId: brandIds.get(p.brand)!,
    };

    await db.$transaction(async (tx) => {
      const row = await tx.product.upsert({
        where: { externalId: p.externalId },
        create: { externalId: p.externalId, ...data },
        update: data,
      });
      await tx.productImage.deleteMany({ where: { productId: row.id } });
      await tx.productAttribute.deleteMany({ where: { productId: row.id } });
      await tx.productImage.create({
        data: { productId: row.id, url: `/demo/products/${slug}.svg`, alt: p.name },
      });
      await tx.productAttribute.createMany({
        data: [
          ["Країна виробництва", brands.find((b) => b.externalId === p.brand)?.country ?? "ЄС"] as [string, string],
          ...(p.attributes ?? []),
        ].map(([name, value], i) => ({
          productId: row.id, name, value, sortOrder: i,
        })),
      });
    });
  }

  console.log(`Seeded ${categories.length} categories, ${brands.length} brands, ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
