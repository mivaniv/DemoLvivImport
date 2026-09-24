import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { slugify } from "@/lib/slug";
import { catalogFileSchema, productSchema, type ImportProduct } from "./format";

// Довільне число-ключ для pg_advisory_xact_lock: гарантує, що одночасно йде лише один імпорт.
const IMPORT_LOCK_KEY = 18_702_024;
// Якщо некоректних товарів більше за цю частку — файл вважаємо зіпсованим і нічого не змінюємо.
const MAX_INVALID_RATIO = 0.2;
// Запуск, що «висить» довше — ймовірно, процес упав; позначаємо його як невдалий.
const STALE_RUN_MS = 2 * 60 * 60 * 1000;

export type ImportError = { item: string; message: string };

export type ImportResult = {
  runId: number;
  status: "SUCCESS" | "FAILED";
  total: number;
  created: number;
  updated: number;
  deactivated: number;
  errors: ImportError[];
  message?: string;
};

class ImportAbort extends Error {}

export async function runImport(db: PrismaClient, filePath: string, opts: { mediaDir: string }): Promise<ImportResult> {
  await db.importRun.updateMany({
    where: { status: "RUNNING", startedAt: { lt: new Date(Date.now() - STALE_RUN_MS) } },
    data: { status: "FAILED", finishedAt: new Date(), message: "Перервано: процес імпорту не завершився" },
  });

  const run = await db.importRun.create({ data: { source: path.basename(filePath) } });
  const errors: ImportError[] = [];
  const stats = { total: 0, created: 0, updated: 0, deactivated: 0 };

  const finish = async (status: "SUCCESS" | "FAILED", message?: string): Promise<ImportResult> => {
    await db.importRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt: new Date(),
        ...stats,
        errorCount: errors.length,
        errors: errors.slice(0, 500),
        message,
      },
    });
    return { runId: run.id, status, ...stats, errors, message };
  };

  try {
    // 1. Читання та перевірка файлу — до будь-яких змін у базі.
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(filePath, "utf8"));
    } catch (e) {
      throw new ImportAbort(`Не вдалося прочитати файл: ${(e as Error).message}`);
    }
    const file = catalogFileSchema.safeParse(raw);
    if (!file.success) {
      throw new ImportAbort(`Некоректна структура файлу: ${file.error.issues[0]?.message ?? "невідома помилка"}`);
    }

    const products: ImportProduct[] = [];
    const seen = new Set<string>();
    file.data.products.forEach((item, index) => {
      const parsed = productSchema.safeParse(item);
      const label = describe(item, index);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        errors.push({ item: label, message: `${issue?.path.join(".") || "товар"}: ${issue?.message}` });
      } else if (seen.has(parsed.data.id)) {
        errors.push({ item: label, message: "Дубль ID у файлі — пропущено" });
      } else {
        seen.add(parsed.data.id);
        products.push(parsed.data);
      }
    });
    stats.total = file.data.products.length;

    if (stats.total === 0) throw new ImportAbort("У файлі немає товарів");
    if (errors.length / stats.total > MAX_INVALID_RATIO) {
      throw new ImportAbort(`Забагато некоректних товарів (${errors.length} з ${stats.total}) — каталог не змінено`);
    }

    // 2. Фото копіюємо заздалегідь: файлові операції не відкочуються разом із транзакцією.
    const imageUrls = new Map<string, string[]>();
    for (const p of products) {
      if (!p.images) continue;
      try {
        imageUrls.set(p.id, await storeImages(p, path.dirname(filePath), opts.mediaDir));
      } catch (e) {
        errors.push({ item: label(p), message: `Фото: ${(e as Error).message}` });
      }
    }

    // 3. Усі зміни — однією транзакцією: або каталог оновлено повністю, або лишився попередній.
    await db.$transaction(
      async (tx) => {
        const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(${IMPORT_LOCK_KEY}) AS locked`;
        if (!locked) throw new ImportAbort("Інший імпорт уже виконується");

        const categoryIds = new Map<string, number>();
        for (const c of file.data.categories) {
          const row = await tx.category.upsert({
            where: { externalId: c.id },
            create: { externalId: c.id, name: c.name, slug: await uniqueSlug(tx, "category", c.name, c.id), sortOrder: c.sortOrder ?? 0 },
            update: { name: c.name, ...(c.sortOrder !== undefined && { sortOrder: c.sortOrder }) },
          });
          categoryIds.set(c.id, row.id);
        }
        // Категорії, які не прийшли у файлі, але вже є в базі (часткове вивантаження).
        const missingCats = [...new Set(products.map((p) => p.categoryId).filter((id): id is string => !!id && !categoryIds.has(id)))];
        for (const row of await tx.category.findMany({ where: { externalId: { in: missingCats } } })) {
          categoryIds.set(row.externalId!, row.id);
        }

        const brandIds = new Map<string, number>();
        for (const name of new Set(products.map((p) => p.brand).filter((b): b is string => !!b))) {
          const slug = slugify(name);
          const row = await tx.brand.upsert({ where: { slug }, create: { slug, name }, update: {} });
          brandIds.set(name, row.id);
        }

        for (const [index, p] of products.entries()) {
          if (p.categoryId && !categoryIds.has(p.categoryId)) {
            errors.push({ item: label(p), message: `Невідома категорія ${p.categoryId} — товар без категорії` });
          }
          // Поле, якого немає у файлі, не чіпаємо: часткове вивантаження не стирає опис чи фасування.
          const inStock = p.inStock ?? (p.stockQty !== undefined ? p.stockQty > 0 : undefined);
          const data = {
            name: p.name,
            isActive: true,
            sortOrder: index,
            ...(p.sku !== undefined && { sku: p.sku || null }),
            ...(p.description !== undefined && { description: p.description || null }),
            ...(p.netWeight !== undefined && { netWeight: p.netWeight || null }),
            ...(p.unitsPerBox !== undefined && { unitsPerBox: p.unitsPerBox }),
            ...(p.unit !== undefined && { unit: p.unit }),
            ...(inStock !== undefined && { inStock }),
            ...(p.stockQty !== undefined && { stockQty: p.stockQty }),
            ...(p.popular !== undefined && { isPopular: p.popular }),
            ...(p.categoryId !== undefined && { categoryId: categoryIds.get(p.categoryId) ?? null }),
            ...(p.brand !== undefined && { brandId: brandIds.get(p.brand) ?? null }),
          };

          const existing = await tx.product.findUnique({ where: { externalId: p.id }, select: { id: true } });
          // Slug задається лише при створенні: посилання на товар не ламаються після перейменування в 1С.
          const product = existing
            ? await tx.product.update({ where: { id: existing.id }, data })
            : await tx.product.create({ data: { ...data, externalId: p.id, slug: await uniqueSlug(tx, "product", p.name, p.sku ?? p.id) } });
          stats[existing ? "updated" : "created"]++;

          if (p.attributes) {
            await tx.productAttribute.deleteMany({ where: { productId: product.id } });
            await tx.productAttribute.createMany({
              data: p.attributes.map((a, i) => ({ productId: product.id, name: a.name, value: a.value, sortOrder: i })),
            });
          }
          const urls = imageUrls.get(p.id);
          if (urls) {
            await tx.productImage.deleteMany({ where: { productId: product.id } });
            await tx.productImage.createMany({
              data: urls.map((url, i) => ({ productId: product.id, url, alt: p.name, sortOrder: i })),
            });
          }
        }

        if (file.data.fullExport) {
          const res = await tx.product.updateMany({
            where: { isActive: true, externalId: { notIn: products.map((p) => p.id) } },
            data: { isActive: false },
          });
          stats.deactivated = res.count;
        }
      },
      { timeout: 10 * 60_000, maxWait: 10_000 },
    );

    return await finish("SUCCESS", errors.length ? `Імпорт завершено з попередженнями: ${errors.length}` : undefined);
  } catch (e) {
    const message = e instanceof ImportAbort ? e.message : `Непередбачена помилка: ${(e as Error).message}`;
    stats.created = stats.updated = stats.deactivated = 0; // транзакцію відкочено
    return finish("FAILED", message);
  }
}

function label(p: ImportProduct) {
  return `${p.id} ${p.name}`;
}

function describe(item: unknown, index: number) {
  const o = (item ?? {}) as Record<string, unknown>;
  return [`#${index + 1}`, typeof o.id === "string" ? o.id : null, typeof o.name === "string" ? o.name : null].filter(Boolean).join(" ");
}

async function uniqueSlug(tx: Prisma.TransactionClient, model: "product" | "category", name: string, suffix: string) {
  const base = slugify(name) || slugify(suffix) || "item";
  for (const candidate of [base, `${base}-${slugify(suffix)}`]) {
    const taken =
      model === "product"
        ? await tx.product.findUnique({ where: { slug: candidate }, select: { id: true } })
        : await tx.category.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function storeImages(p: ImportProduct, baseDir: string, mediaDir: string): Promise<string[]> {
  const folder = slugify(p.id) || "product";
  const targetDir = path.join(mediaDir, "products", folder);
  await mkdir(targetDir, { recursive: true });
  const urls: string[] = [];
  for (const src of p.images ?? []) {
    if (/^https?:\/\//i.test(src)) {
      urls.push(src); // зовнішні адреси зберігаємо як є
      continue;
    }
    const from = path.resolve(baseDir, src);
    if (!from.startsWith(path.resolve(baseDir))) throw new Error(`шлях поза текою вивантаження: ${src}`);
    const ext = path.extname(from).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg"].includes(ext)) throw new Error(`непідтримуваний формат ${src}`);
    const fileName = `${slugify(path.basename(from, ext)) || "image"}${ext}`;
    await copyFile(from, path.join(targetDir, fileName));
    urls.push(`/media/products/${folder}/${fileName}`);
  }
  return urls;
}
