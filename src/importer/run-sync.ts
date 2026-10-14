import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { slugify } from "@/lib/slug";
import { parseCatalogText } from "./adapters/detect";
import { fetchSource, SourceError } from "./fetch-source";
import { catalogFileSchema, productSchema, type ImportProduct } from "./format";
import { acquireImportLock, failStaleRuns, failureMessage, ImportAbort, type ImportError } from "./shared";

// Задача 1 — синхронізація: завантажити вивантаження з 1С, перевірити, створити нові товари
// й оновити наявні за ID з 1С. Нічого не приховує — це робить задача 2 (run-cleanup.ts).

// Якщо некоректних товарів більше за цю частку — файл вважаємо зіпсованим і нічого не змінюємо.
const MAX_INVALID_RATIO = 0.2;

export type SyncResult = {
  runId: number;
  status: "SUCCESS" | "FAILED";
  fullExport: boolean;
  total: number;
  created: number;
  updated: number;
  restored: number;
  errors: ImportError[];
  message?: string;
};

export type SyncOptions = {
  mediaDir: string;
  archiveDir?: string;
  auth?: { user: string; password: string };
  priceType?: string; // тип ціни CommerceML (Ид або назва)
};

export async function runSync(db: PrismaClient, source: string, opts: SyncOptions): Promise<SyncResult> {
  await failStaleRuns(db);

  const run = await db.importRun.create({ data: { kind: "SYNC", source } });
  const errors: ImportError[] = [];
  const stats = { total: 0, created: 0, updated: 0, restored: 0 };
  let fullExport = false;

  const finish = async (status: "SUCCESS" | "FAILED", message?: string): Promise<SyncResult> => {
    await db.importRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt: new Date(),
        fullExport,
        ...stats,
        errorCount: errors.length,
        errors: errors.slice(0, 500),
        message,
      },
    });
    return { runId: run.id, status, fullExport, ...stats, errors, message };
  };

  try {
    // 1. Завантаження, розбір і перевірка — до будь-яких змін у базі.
    const isUrl = /^https?:\/\//i.test(source);
    let raw: unknown;
    try {
      const { text } = await fetchSource(source, { archiveDir: opts.archiveDir, auth: opts.auth });
      raw = parseCatalogText(text, isUrl ? source : undefined, { priceType: opts.priceType }).raw;
    } catch (e) {
      throw new ImportAbort(e instanceof SourceError ? e.message : `Не вдалося розібрати файл: ${(e as Error).message}`);
    }
    const file = catalogFileSchema.safeParse(raw);
    if (!file.success) {
      throw new ImportAbort(`Некоректна структура файлу: ${file.error.issues[0]?.message ?? "невідома помилка"}`);
    }
    fullExport = file.data.fullExport;

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

    // 2. Фото: посилання зберігаються як є; локальні файли (ручний імпорт) копіюються в MEDIA_DIR.
    // Файлові операції не відкочуються разом із транзакцією, тому виконуються заздалегідь.
    const imageUrls = new Map<string, string[]>();
    for (const p of products) {
      if (!p.images) continue;
      try {
        imageUrls.set(p.id, await storeImages(p, isUrl ? null : path.dirname(path.resolve(source)), opts.mediaDir));
      } catch (e) {
        errors.push({ item: label(p), message: `Фото: ${(e as Error).message}` });
      }
    }

    // 3. Усі зміни — однією транзакцією: або каталог оновлено повністю, або лишився попередній.
    await db.$transaction(
      async (tx) => {
        await acquireImportLock(tx);

        const categoryIds = new Map<string, number>();
        for (const c of file.data.categories) {
          const row = await tx.category.upsert({
            where: { externalId: c.id },
            create: {
              externalId: c.id,
              name: c.name,
              parentExternalId: c.parentId ?? null,
              slug: await uniqueSlug(tx, "category", c.name, c.id),
              sortOrder: c.sortOrder ?? 0,
            },
            update: {
              name: c.name,
              parentExternalId: c.parentId ?? null,
              ...(c.sortOrder !== undefined && { sortOrder: c.sortOrder }),
            },
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
            // Товар є у файлі — показуємо його, навіть якщо раніше приховало прибирання (автовідновлення).
            isActive: true,
            hiddenAt: null,
            lastSeenRunId: run.id,
            sortOrder: index,
            ...(p.sku !== undefined && { sku: p.sku || null }),
            ...(p.description !== undefined && { description: p.description || null }),
            ...(p.netWeight !== undefined && { netWeight: p.netWeight || null }),
            ...(p.unitsPerBox !== undefined && { unitsPerBox: p.unitsPerBox }),
            ...(p.unit !== undefined && { unit: p.unit }),
            ...(inStock !== undefined && { inStock }),
            ...(p.stockQty !== undefined && { stockQty: p.stockQty }),
            ...(p.popular !== undefined && { isPopular: p.popular }),
            ...(p.isNew !== undefined && { isNew: p.isNew }),
            ...(p.sale !== undefined && { isSale: p.sale }),
            ...(p.barcode !== undefined && { barcode: p.barcode || null }),
            ...(p.minOrder !== undefined && { minOrder: p.minOrder }),
            ...(p.price !== undefined && { price: p.price }),
            // стара ціна має сенс лише разом із поточною
            ...(p.price !== undefined && { oldPrice: p.oldPrice ?? null }),
            ...(p.categoryId !== undefined && { categoryId: categoryIds.get(p.categoryId) ?? null }),
            ...(p.brand !== undefined && { brandId: brandIds.get(p.brand) ?? null }),
          };

          const existing = await tx.product.findUnique({ where: { externalId: p.id }, select: { id: true, isActive: true } });
          // Slug задається лише при створенні: посилання на товар не ламаються після перейменування в 1С.
          const product = existing
            ? await tx.product.update({ where: { id: existing.id }, data })
            : await tx.product.create({ data: { ...data, externalId: p.id, slug: await uniqueSlug(tx, "product", p.name, p.sku ?? p.id) } });
          stats[existing ? "updated" : "created"]++;
          if (existing && !existing.isActive) stats.restored++;

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
      },
      { timeout: 10 * 60_000, maxWait: 10_000 },
    );

    const notes = [
      !fullExport && "файл містить лише зміни — прибирання не виконуватиметься",
      errors.length > 0 && `попереджень: ${errors.length}`,
    ].filter(Boolean);
    return await finish("SUCCESS", notes.length ? notes.join("; ") : undefined);
  } catch (e) {
    stats.created = stats.updated = stats.restored = 0; // транзакцію відкочено
    return finish("FAILED", failureMessage(e));
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

// baseDir = null: джерело — посилання, локальних файлів поруч немає.
async function storeImages(p: ImportProduct, baseDir: string | null, mediaDir: string): Promise<string[]> {
  const folder = slugify(p.id) || "product";
  const urls: string[] = [];
  for (const src of p.images ?? []) {
    if (/^https?:\/\//i.test(src)) {
      urls.push(src); // фото за посиланням показуємо напряму
      continue;
    }
    if (!baseDir) throw new Error(`відносний шлях без адреси джерела: ${src}`);
    const from = path.resolve(baseDir, src);
    if (!from.startsWith(path.resolve(baseDir))) throw new Error(`шлях поза текою вивантаження: ${src}`);
    const ext = path.extname(from).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg"].includes(ext)) throw new Error(`непідтримуваний формат ${src}`);
    const targetDir = path.join(mediaDir, "products", folder);
    await mkdir(targetDir, { recursive: true });
    const fileName = `${slugify(path.basename(from, ext)) || "image"}${ext}`;
    await copyFile(from, path.join(targetDir, fileName));
    urls.push(`/media/products/${folder}/${fileName}`);
  }
  return urls;
}
