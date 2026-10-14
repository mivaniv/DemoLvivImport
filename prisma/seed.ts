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

// Демонстраційні ціни, штрихкоди й позначки (у реальних даних приходять з 1С / ставить менеджер).
const DEMO_PRICES: Record<string, number> = {
  "00-00001201": 68.4, "00-00001202": 68.4, "00-00001203": 71.2, "00-00001204": 71.2, "00-00001205": 74.9,
  "00-00002101": 612, "00-00002102": 648, "00-00002103": 189.5,
  "00-00003101": 79.9, "00-00003102": 76.5, "00-00003103": 79.9, "00-00003104": 82.3,
  "00-00004101": 94.6, "00-00004102": 96.2, "00-00004103": 104.8,
  "00-00005101": 42.7, "00-00005102": 44.1, "00-00005103": 42.7,
};
const NEW_ITEMS = new Set(["00-00001205", "00-00002103", "00-00004103", "00-00005103"]);
const SALE_ITEMS: Record<string, number> = { "00-00003101": 86.5, "00-00002101": 659 }; // стара ціна

// EAN-13 з контрольною цифрою для демотоварів (префікс 482 — Україна)
function demoBarcode(index: number) {
  const base = `482000${String(1000 + index).padStart(6, "0")}`;
  const sum = [...base].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return base + ((10 - (sum % 10)) % 10);
}

function demoCommerce(externalId: string, index: number) {
  return {
    barcode: demoBarcode(index),
    price: DEMO_PRICES[externalId] ?? null,
    oldPrice: SALE_ITEMS[externalId] ?? null,
    isNew: NEW_ITEMS.has(externalId),
    isSale: externalId in SALE_ITEMS,
    minOrder: 1,
  };
}

// Відгуки з чинного сайту lvivimport.com (без спаму), разом із відповідями компанії.
const REVIEWS = [
  { author: "Оксана В.", rating: 5, date: "2021-10-09", text: "Дякую Львівімпорт за якісну роботу та надійність на ринку! Завжди почують, підуть на зустріч, допоможуть вирішити питання якщо вони в межах їх компетенцій. Надійний постачальник. Тішить що постійно росте асортимент і рівень послуг. Рекомендую", reply: "Дякуємо, пані Оксано. Для Вас стараємось!" },
  { author: "Вікторія Мулинець", rating: 5, date: "2021-11-05", text: "Львівімпорт молодці! Співпрацювати одне задоволення, представники професійні, асортимент постійно розширюється, умови гнучкі, обсяг сервісів постійно росте. Рекомендую!", reply: "Дякуємо, пані Вікторіє. Старатимемось і надалі тримати планку!" },
  { author: "Олександр Петришин", rating: 5, date: "2021-11-12", text: "Співпрацюємо з Львівімпорт не перший рік. За час співпраці організація показала себе з кращої сторони. Продукція якісна, доставка швидка, робота торгових представників на високому рівні. Найбільше імпонує те що організація прислухається до потреб своїх клієнтів і вносить відповідні зміни в орагінзацію роботи, постачання, асортимент продукції. Як результат, ми відносимося до Львівімпорт як до надійного постачальника і рекомендуємо компаніям партнерам. Так тримати!", reply: "Дякуємо, пане Олександр! Раді що витримали перевірку часом. З Вами теж приємно мати справу!" },
  { author: "Ірина", rating: 5, date: "2022-01-26", text: "Менеджери швидко і професійно формують замовлення, допомагають підібрати товар!" },
  { author: "Ольга", rating: 5, date: "2023-07-12", text: "Чудові продукти ціни та якість обслуговування! Рекомендуємо!" },
  { author: "Михайло", rating: 5, date: "2023-08-13", text: "Співпрацюючи з ТОВ Львівімпорт, я переконався на високому сервісі компанії, та правильному підході щодо легального ведення бізнесу. Щоразу без нагадувань мені надають повний пакет документів. Я приємно був здивований коли при постачанні продукції мені приходять сертифікати якості і інші супровідні документи, і я з наданими документами ділюсь з кінцевим покупцем. Також хочу звернути увагу на 100% наявність продукції та швидкому підбору та формуванні замовлення. Дякую, Ви - ПРОФЕСІОНАЛИ!" },
  { author: "Ibrahim", rating: 4, date: "2023-10-03", text: "All good, but i wait for my price about 2 hour." },
];

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
      ...demoCommerce(p.externalId, index),
      isActive: true,
      hiddenAt: null,
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

  // Відгуки переносимо один раз — повторний seed не дублює їх.
  if ((await db.review.count()) === 0) {
    await db.review.createMany({
      data: REVIEWS.map((r) => ({
        author: r.author,
        rating: r.rating,
        text: r.text,
        reply: r.reply ?? null,
        status: "PUBLISHED" as const,
        createdAt: new Date(`${r.date}T12:00:00+03:00`),
        publishedAt: new Date(`${r.date}T12:00:00+03:00`),
      })),
    });
  }

  console.log(`Seeded ${categories.length} categories, ${brands.length} brands, ${products.length} products, reviews.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
