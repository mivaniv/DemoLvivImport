import { slugify } from "@/lib/slug";
import { parseCatalogText } from "./adapters/detect";
import { catalogFileSchema, productSchema, type ImportProduct } from "./format";

// Вивантаження 1С → каталог статичної версії (той самий формат, що src/data/catalog-snapshot.json),
// без бази: результат той самий, що дає ланцюжок import:sync → import:cleanup → snapshot.
// Цей самий алгоритм рядок у рядок повторює deploy/hosting/api/update-catalog.php — його щодня
// запускає крон хостингу. Змінюючи щось тут, змініть і там (перевірка збігу — docs/hosting.md).

// Ті самі пороги, що в run-sync.ts і IMPORT_CLEANUP_MAX_RATIO
export const MAX_INVALID_RATIO = 0.2;
export const MAX_REMOVED_RATIO = 0.3;

export type FeedCategory = { id: number; externalId: string | null; slug: string; name: string; sortOrder: number; parentId: number | null };
export type FeedBrand = { id: number; slug: string; name: string; country: string | null };
export type FeedProduct = {
  id: number;
  externalId: string;
  sku: string | null;
  barcode: string | null;
  slug: string;
  name: string;
  description: string | null;
  netWeight: string | null;
  unitsPerBox: number | null;
  unit: string;
  minOrder: number;
  inStock: boolean;
  isPopular: boolean;
  isNew: boolean;
  isSale: boolean;
  sortOrder: number;
  categoryId: number | null;
  brandId: number | null;
  createdAt: string;
  images: { url: string; alt: string | null }[];
  attributes: { name: string; value: string }[];
};
export type FeedCatalog = { categories: FeedCategory[]; brands: FeedBrand[]; products: FeedProduct[] };

// Попередній каталог: знімок, у старих знімках категорії ще без externalId
export type PreviousCatalog = {
  categories: (Omit<FeedCategory, "externalId"> & { externalId?: string | null })[];
  brands: FeedBrand[];
  products: FeedProduct[];
};

export type FeedReport = { total: number; created: number; updated: number; removed: number; warnings: string[] };

export class FeedError extends Error {}

export function feedToCatalog(
  text: string,
  previous: PreviousCatalog,
  opts: { sourceUrl?: string; imageBase?: string; now?: Date } = {},
): { catalog: FeedCatalog; report: FeedReport } {
  let raw: unknown;
  try {
    raw = parseCatalogText(text, opts.sourceUrl, { imageBase: opts.imageBase }).raw;
  } catch (e) {
    throw new FeedError(`Не вдалося розібрати файл: ${(e as Error).message}`);
  }
  const file = catalogFileSchema.safeParse(raw);
  if (!file.success) throw new FeedError(`Некоректна структура файлу: ${file.error.issues[0]?.message ?? "невідома помилка"}`);
  if (!file.data.fullExport) throw new FeedError("Файл містить лише зміни, а не весь каталог — каталог не змінено");

  const warnings: string[] = [];
  const items: ImportProduct[] = [];
  const seen = new Set<string>();
  for (const item of file.data.products) {
    const parsed = productSchema.safeParse(item);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      warnings.push(`${describe(item)}: ${issue?.path.join(".") || "товар"}: ${issue?.message}`);
    } else if (seen.has(parsed.data.id)) {
      warnings.push(`${describe(item)}: дубль ID у файлі — пропущено`);
    } else {
      seen.add(parsed.data.id);
      items.push(parsed.data);
    }
  }
  const total = file.data.products.length;
  if (total === 0) throw new FeedError("У файлі немає товарів");
  if ((total - items.length) / total > MAX_INVALID_RATIO) {
    throw new FeedError(`Забагато некоректних товарів (${total - items.length} з ${total}) — каталог не змінено`);
  }
  const removed = previous.products.filter((p) => !seen.has(p.externalId)).length;
  if (previous.products.length > 0 && removed / previous.products.length > MAX_REMOVED_RATIO) {
    throw new FeedError(`У файлі бракує ${removed} з ${previous.products.length} товарів сайту — схоже на неповне вивантаження, каталог не змінено`);
  }
  for (const p of items) {
    for (const url of p.images ?? []) {
      if (!/^https?:\/\//i.test(url)) throw new FeedError(`Фото «${url}» без повної адреси: вкажіть адресу теки з фото (IMPORT_IMAGE_BASE_URL)`);
    }
  }

  // Категорії: ті самі id і slug, що й раніше (за ID з 1С; у старих знімках — за slug назви)
  const nextId = (rows: { id: number }[]) => {
    let max = rows.reduce((m, r) => Math.max(m, r.id), 0);
    return () => ++max;
  };
  const newCategoryId = nextId(previous.categories);
  const categorySlugs = new Set(previous.categories.map((c) => c.slug));
  const prevCategoryByExt = new Map(previous.categories.filter((c) => c.externalId).map((c) => [c.externalId!, c]));
  // Старий знімок без externalId: slug створювався як «назва», а за збігу назв — «назва-ID з 1С»
  const prevCategoryBySlug = previous.categories.some((c) => c.externalId) ? new Map() : new Map(previous.categories.map((c) => [c.slug, c]));
  const bySlug = (name: string, id: string) => {
    for (const slug of [`${slugify(name)}-${slugify(id)}`, slugify(name)]) {
      const c = prevCategoryBySlug.get(slug);
      if (c) {
        prevCategoryBySlug.delete(slug);
        return c;
      }
    }
  };
  const categories = file.data.categories.map((c) => {
    const old = prevCategoryByExt.get(c.id) ?? bySlug(c.name, c.id);
    return {
      id: old?.id ?? newCategoryId(),
      externalId: c.id,
      slug: old?.slug ?? uniqueSlug(categorySlugs, c.name, c.id),
      name: c.name,
      sortOrder: c.sortOrder ?? old?.sortOrder ?? 0,
      parentExternalId: c.parentId ?? null,
    };
  });
  const categoryByExt = new Map(categories.map((c) => [c.externalId, c]));

  // Бренди: за slug назви, як у базі (назву й країну нового бренду не перезаписуємо)
  const newBrandId = nextId(previous.brands);
  const prevBrandBySlug = new Map(previous.brands.map((b) => [b.slug, b]));
  const brandBySlug = new Map<string, FeedBrand>();
  for (const name of items.map((p) => p.brand).filter((b): b is string => !!b)) {
    const slug = slugify(name);
    if (!brandBySlug.has(slug)) brandBySlug.set(slug, prevBrandBySlug.get(slug) ?? { id: newBrandId(), slug, name, country: null });
  }

  const newProductId = nextId(previous.products);
  const productSlugs = new Set(previous.products.map((p) => p.slug));
  const prevProductByExt = new Map(previous.products.map((p) => [p.externalId, p]));
  const createdAt = (opts.now ?? new Date()).toISOString();
  let created = 0;

  // Поле, якого немає у файлі, береться з попереднього каталогу — як оновлення в базі
  const products: FeedProduct[] = items.map((p, index) => {
    const old = prevProductByExt.get(p.id);
    if (!old) created++;
    const category = p.categoryId !== undefined ? categoryByExt.get(p.categoryId) : undefined;
    if (p.categoryId && !category) warnings.push(`${p.id} ${p.name}: невідома категорія ${p.categoryId} — товар без категорії`);
    const inStock = p.inStock ?? (p.stockQty !== undefined ? p.stockQty > 0 : undefined);
    const keep = <T>(value: T | undefined, before: T | undefined, fallback: T) => (value !== undefined ? value : before !== undefined ? before : fallback);
    return {
      id: old?.id ?? newProductId(),
      externalId: p.id,
      sku: keep(p.sku === undefined ? undefined : p.sku || null, old?.sku, null),
      barcode: keep(p.barcode === undefined ? undefined : p.barcode || null, old?.barcode, null),
      slug: old?.slug ?? uniqueSlug(productSlugs, p.name, p.sku ?? p.id),
      name: p.name,
      description: keep(p.description === undefined ? undefined : p.description || null, old?.description, null),
      netWeight: keep(p.netWeight === undefined ? undefined : p.netWeight || null, old?.netWeight, null),
      unitsPerBox: keep(p.unitsPerBox, old?.unitsPerBox, null),
      unit: keep(p.unit, old?.unit, "шт."),
      minOrder: keep(p.minOrder, old?.minOrder, 1),
      inStock: keep(inStock, old?.inStock, true),
      isPopular: keep(p.popular, old?.isPopular, false),
      isNew: keep(p.isNew, old?.isNew, false),
      isSale: keep(p.sale, old?.isSale, false),
      sortOrder: index,
      categoryId: p.categoryId !== undefined ? (category?.id ?? null) : (old?.categoryId ?? null),
      brandId: p.brand !== undefined ? (brandBySlug.get(slugify(p.brand))?.id ?? null) : (old?.brandId ?? null),
      createdAt: old?.createdAt ?? createdAt,
      images: p.images !== undefined ? p.images.map((url) => ({ url, alt: p.name })) : (old?.images ?? []),
      attributes: p.attributes ?? old?.attributes ?? [],
    };
  });

  // Лише категорії з товарами та їхні батьківські розділи (для дерева в каталозі) — як у export-snapshot.ts
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const used = new Set<number>();
  for (const p of products) {
    for (let id = p.categoryId; id !== null && !used.has(id); ) {
      used.add(id);
      const parent = categoryById.get(id)?.parentExternalId;
      id = (parent && categoryByExt.get(parent)?.id) ?? null;
    }
  }
  const usedBrands = new Set(products.map((p) => p.brandId));

  return {
    catalog: {
      categories: categories
        .filter((c) => used.has(c.id))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
        .map(({ parentExternalId, ...c }) => ({ ...c, parentId: (parentExternalId && categoryByExt.get(parentExternalId)?.id) || null })),
      brands: [...brandBySlug.values()].filter((b) => usedBrands.has(b.id)).sort((a, b) => compare(a.name, b.name) || a.id - b.id),
      products,
    },
    report: { total, created, updated: products.length - created, removed, warnings },
  };
}

// Порівняння за кодами символів — однаково в JS і PHP (strcmp), без залежності від локалі
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// Як uniqueSlug у run-sync.ts: назва, за збігу — назва-артикул (або ID)
function uniqueSlug(taken: Set<string>, name: string, suffix: string) {
  const base = slugify(name) || slugify(suffix) || "item";
  let slug = [base, `${base}-${slugify(suffix)}`].find((s) => !taken.has(s));
  for (let i = 2; !slug; i++) if (!taken.has(`${base}-${i}`)) slug = `${base}-${i}`;
  taken.add(slug);
  return slug;
}

function describe(item: unknown) {
  const o = (item ?? {}) as Record<string, unknown>;
  return [typeof o.id === "string" ? o.id : null, typeof o.name === "string" ? o.name : null].filter(Boolean).join(" ") || "товар";
}
