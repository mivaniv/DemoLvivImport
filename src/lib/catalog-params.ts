// Розбір і побудова URL каталогу. Стан фільтрів живе лише в адресі — посилання можна надіслати колезі.

export const SORT_KEYS = ["default", "popular", "new", "price_asc", "price_desc", "name_asc"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

// Підписи — як на lvivimport.com
export const SORT_LABELS: Record<SortKey, string> = {
  default: "За замовчуванням",
  popular: "За популярністю",
  new: "За останніми",
  price_asc: "За ціною: від нижчої до вищої",
  price_desc: "За ціною: від вищої до нижчої",
  name_asc: "За назвою",
};
export const PRICE_SORTS: SortKey[] = ["price_asc", "price_desc"];

export const PER_PAGE_OPTIONS = [12, 24, 48] as const;
export type PerPage = (typeof PER_PAGE_OPTIONS)[number];

// Добірки з окремими сторінками: /promo, /new-products, /popular
export type Collection = "" | "sale" | "new" | "popular";
export const COLLECTIONS: Record<Exclude<Collection, "">, { path: string; title: string }> = {
  sale: { path: "/promo", title: "Акції" },
  new: { path: "/new-products", title: "Новинки" },
  popular: { path: "/popular", title: "Популярні позиції" },
};

export type CatalogState = {
  collection: Collection;
  q: string;
  category: string;
  brands: string[];
  inStock: boolean;
  box: number[]; // кількість у ящику
  priceMin?: number;
  priceMax?: number;
  sort: SortKey;
  view: "grid" | "list";
  perPage: PerPage;
  page: number;
  // «Завантажити ще»: скільки сторінок показано поспіль, починаючи з page
  count: number;
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const posInt = (v: string, fallback: number, max = 10_000) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
};
const price = (v: string) => {
  const n = Number.parseFloat(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function parseCatalogParams(raw: RawParams, collection: Collection = ""): CatalogState {
  const sort = first(raw.sort) as SortKey;
  const perPage = Number(first(raw.per_page)) as PerPage;
  return {
    collection,
    q: first(raw.q).slice(0, 100),
    category: first(raw.category),
    brands: first(raw.brand).split(",").filter(Boolean),
    inStock: first(raw.stock) === "1",
    box: first(raw.box).split(",").map((s) => posInt(s, 0)).filter((n) => n > 0),
    priceMin: price(first(raw.price_min)),
    priceMax: price(first(raw.price_max)),
    sort: SORT_KEYS.includes(sort) ? sort : "default",
    view: first(raw.view) === "list" ? "list" : "grid",
    perPage: PER_PAGE_OPTIONS.includes(perPage) ? perPage : 24,
    page: posInt(first(raw.page), 1),
    count: posInt(first(raw.count), 1, 20),
  };
}

export function catalogHref(state: CatalogState, patch: Partial<CatalogState> = {}): string {
  // Будь-яка зміна фільтрів повертає на першу сторінку й скидає «Завантажити ще».
  const next: CatalogState = { ...state, page: 1, count: 1, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.category) params.set("category", next.category);
  if (next.brands.length) params.set("brand", next.brands.join(","));
  if (next.inStock) params.set("stock", "1");
  if (next.box.length) params.set("box", next.box.join(","));
  if (next.priceMin !== undefined) params.set("price_min", String(next.priceMin));
  if (next.priceMax !== undefined) params.set("price_max", String(next.priceMax));
  if (next.sort !== "default") params.set("sort", next.sort);
  if (next.view !== "grid") params.set("view", next.view);
  if (next.perPage !== 24) params.set("per_page", String(next.perPage));
  if (next.page > 1) params.set("page", String(next.page));
  if (next.count > 1) params.set("count", String(next.count));
  const base = next.collection ? COLLECTIONS[next.collection].path : "/catalog";
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function hasActiveFilters(s: CatalogState) {
  return Boolean(s.q || s.category || s.brands.length || s.inStock || s.box.length || s.priceMin !== undefined || s.priceMax !== undefined);
}
