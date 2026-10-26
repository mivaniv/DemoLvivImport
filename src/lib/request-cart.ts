// Кошик-заявка для каталогу без цін: живе в браузері (localStorage) і надсилається менеджеру формою.
// Тут лише чиста логіка кількостей і тексту заявки — без React, щоб її можна було тестувати.

export const REQUEST_MAX_QTY = 100_000;
export const REQUEST_MAX_LINES = 200;

export type RequestItem = {
  slug: string;
  sku: string | null;
  name: string;
  image: string | null;
  unit: string;
  unitsPerBox: number | null;
  minOrder: number;
  qty: number; // завжди у штуках
};

type Qty = Pick<RequestItem, "unit" | "unitsPerBox" | "minOrder">;

const fmt = (n: number) => n.toLocaleString("uk-UA", { maximumFractionDigits: 1 });

// Товар продається ящиками, якщо мінімальне замовлення більше за штуку (у 1С: from_piece = 0)
export function byBox(p: Qty): boolean {
  return p.minOrder > 1 && Boolean(p.unitsPerBox && p.unitsPerBox > 0);
}

// На скільки штук змінює кількість кнопка «+»
export function orderStep(p: Qty): number {
  return byBox(p) ? p.unitsPerBox! : 1;
}

export function minQty(p: Qty): number {
  const step = orderStep(p);
  return Math.max(step, Math.ceil(Math.max(1, p.minOrder) / step) * step);
}

// Кількість, яку можна замовити: не менше мінімуму, кратна ящику (для товарів «від ящика»)
export function clampQty(p: Qty, qty: number): number {
  const step = orderStep(p);
  const n = Number.isFinite(qty) ? Math.ceil(Math.trunc(qty) / step) * step : 0;
  return Math.min(Math.floor(REQUEST_MAX_QTY / step) * step, Math.max(minQty(p), n));
}

// «2 ящ.» або «5 шт.»
export function shortQty(p: Qty, qty: number): string {
  return byBox(p) ? `${fmt(qty / orderStep(p))} ящ.` : `${qty} ${p.unit}`;
}

// «2 ящ. = 24 шт.», «5 шт. ≈ 0,4 ящ.» або просто «5 шт.»
export function describeQty(p: Qty, qty: number): string {
  if (byBox(p)) return `${shortQty(p, qty)} = ${qty} ${p.unit}`;
  return p.unitsPerBox ? `${qty} ${p.unit} ≈ ${fmt(qty / p.unitsPerBox)} ящ.` : `${qty} ${p.unit}`;
}

// «1 ящ. (12 шт.)» або «1 шт.»
export function stepLabel(p: Qty): string {
  return byBox(p) ? `1 ящ. (${orderStep(p)} ${p.unit})` : `1 ${p.unit}`;
}

// Підказка біля «+»: скільки буде після ще одного кроку
export function nextHint(p: Qty, qty: number): string {
  return `+${stepLabel(p)} → ${describeQty(p, clampQty(p, qty + orderStep(p)))}`;
}

export function requestTotals(items: RequestItem[]) {
  return {
    lines: items.length,
    pieces: items.reduce((s, i) => s + i.qty, 0),
    boxes: items.reduce((s, i) => s + (i.unitsPerBox ? i.qty / i.unitsPerBox : 0), 0),
  };
}

export function formatBoxes(boxes: number): string {
  return fmt(boxes);
}

// Рядки заявки для листа менеджеру
export function requestLines(items: RequestItem[]): string[] {
  return items.map((i, n) => `${n + 1}. ${i.name}${i.sku ? ` (${i.sku})` : ""} — ${describeQty(i, i.qty)}`);
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null);

// Дані з localStorage або з форми — перевіряємо все, що прийшло ззовні
export function parseRequestItems(raw: unknown): RequestItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const items: RequestItem[] = [];
  for (const r of raw.slice(0, REQUEST_MAX_LINES)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const slug = str(o.slug, 200);
    const name = str(o.name, 300);
    const qty = int(o.qty);
    if (!slug || !name || !qty || seen.has(slug)) continue;
    seen.add(slug);
    const p = { unit: str(o.unit, 20) ?? "шт.", unitsPerBox: int(o.unitsPerBox), minOrder: int(o.minOrder) ?? 1 };
    items.push({ slug, name, sku: str(o.sku, 60), image: str(o.image, 1000), ...p, qty: clampQty(p, qty) });
  }
  return items;
}
