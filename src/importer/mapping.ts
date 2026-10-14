// Відповідність довільних властивостей 1С полям сайту. У 1С вага, фасування чи бренд часто
// задаються як «параметр»/«властивість» з довільною назвою — перелічуємо можливі назви.
// Після отримання реального вивантаження списки уточнюються тут, код адаптерів не змінюється.

export const FIELD_ALIASES = {
  netWeight: ["вага", "вага нетто", "маса нетто", "вес", "вес нетто", "масса нетто", "масса", "фасування", "фасовка"],
  unitsPerBox: [
    "кількість в упаковці", "кількість у коробці", "кількість в коробці", "кількість в ящику", "кратність",
    "количество в упаковке", "количество в коробке", "количество в ящике", "кратность", "в упаковке",
  ],
  brand: ["бренд", "торгова марка", "торговельна марка", "виробник", "торговая марка", "производитель", "brand"],
  minOrder: ["мінімальне замовлення", "мін. замовлення", "мінімальна партія", "минимальный заказ", "мин. заказ"],
  barcode: ["штрихкод", "штрих-код", "штрихкод (ean)", "ean", "штрихкод товару"],
  // Позначки добірок: значення «так»/«1»/«true» вмикає, «ні»/«0»/«false» вимикає
  isNew: ["новинка", "новинки", "new"],
  sale: ["акція", "акційний", "акционный", "акция", "sale"],
  popular: ["топ", "хіт", "хіт продажів", "популярний", "хит", "хит продаж", "top"],
} as const;

const YES = ["так", "да", "1", "true", "yes", "+"];
const NO = ["ні", "нет", "0", "false", "no", "-"];

export function toFlag(value: string | undefined): boolean | undefined {
  const v = (value ?? "").trim().toLocaleLowerCase("uk");
  if (YES.includes(v)) return true;
  if (NO.includes(v)) return false;
  return undefined;
}

// «1 234,50» / "1234.5" → 1234.5
export function toPrice(value: string | undefined): number | undefined {
  const n = Number.parseFloat((value ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : undefined;
}

export type MappedField = keyof typeof FIELD_ALIASES;

const norm = (s: string) => s.trim().toLocaleLowerCase("uk").replace(/\s+/g, " ").replace(/[.:]$/, "");

export function fieldFor(paramName: string): MappedField | undefined {
  const n = norm(paramName);
  return (Object.keys(FIELD_ALIASES) as MappedField[]).find((f) => (FIELD_ALIASES[f] as readonly string[]).includes(n));
}

// Поля товару, які можуть прийти як довільні властивості 1С
export type MappedFields = {
  netWeight?: string;
  unitsPerBox?: number;
  brand?: string;
  minOrder?: number;
  barcode?: string;
  isNew?: boolean;
  sale?: boolean;
  popular?: boolean;
  attributes: { name: string; value: string }[];
};

// Розкладає параметр «назва = значення» у відповідне поле товару; невідомі параметри — у характеристики.
export function applyParam(acc: MappedFields, name: string, value: string) {
  switch (fieldFor(name)) {
    case "netWeight":
      acc.netWeight = value;
      break;
    case "unitsPerBox":
      acc.unitsPerBox = toPositiveInt(value) ?? acc.unitsPerBox;
      break;
    case "brand":
      acc.brand ??= value;
      break;
    case "minOrder":
      acc.minOrder = toPositiveInt(value) ?? acc.minOrder;
      break;
    case "barcode":
      acc.barcode ??= value;
      break;
    case "isNew":
      acc.isNew = toFlag(value) ?? acc.isNew;
      break;
    case "sale":
      acc.sale = toFlag(value) ?? acc.sale;
      break;
    case "popular":
      acc.popular = toFlag(value) ?? acc.popular;
      break;
    default:
      acc.attributes.push({ name, value });
  }
}

// «12 шт», "12,0" → 12
export function toPositiveInt(value: string | undefined): number | undefined {
  const n = Number.parseFloat((value ?? "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

// Опис з 1С часто містить HTML — на сайті показуємо чистий текст з абзацами.
const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", laquo: "«", raquo: "»", ndash: "–", mdash: "—" };

export function htmlToText(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const text = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|h\d)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (m, e: string) =>
      e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()] ?? m,
    )
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || undefined;
}
