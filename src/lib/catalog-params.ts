// Розбір і побудова URL каталогу. Стан фільтрів живе лише в адресі — посилання можна надіслати колезі.

export const SORT_KEYS = ["popular", "name_asc", "name_desc", "new"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export type CatalogState = {
  q: string;
  category: string;
  brands: string[];
  inStock: boolean;
  sort: SortKey;
  view: "grid" | "list";
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseCatalogParams(raw: RawParams): CatalogState {
  const sort = first(raw.sort) as SortKey;
  const page = Number.parseInt(first(raw.page), 10);
  return {
    q: first(raw.q).slice(0, 100),
    category: first(raw.category),
    brands: first(raw.brand).split(",").filter(Boolean),
    inStock: first(raw.stock) === "1",
    sort: SORT_KEYS.includes(sort) ? sort : "popular",
    view: first(raw.view) === "list" ? "list" : "grid",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function catalogHref(state: CatalogState, patch: Partial<CatalogState> = {}): string {
  // Будь-яка зміна фільтрів, крім сторінки, повертає на першу сторінку.
  const next = { ...state, page: 1, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.category) params.set("category", next.category);
  if (next.brands.length) params.set("brand", next.brands.join(","));
  if (next.inStock) params.set("stock", "1");
  if (next.sort !== "popular") params.set("sort", next.sort);
  if (next.view !== "grid") params.set("view", next.view);
  if (next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
