import { htmlToText, toPositiveInt, toPrice } from "../mapping";
import { absoluteUrl, asArray, parseXml, str } from "./xml";
import type { RawCatalog } from "./types";

// Вивантаження 1С для lvivimport.com (його ж імпортує WP All Import на чинному сайті):
// <goods><categories><cat/></categories><products><product/></products></goods>.
// Файл завжди містить увесь каталог (products_full), тому fullExport = true.
// Правила перетворення повторюють функції WP All Import на lvivimport.com (catname, productImage…),
// див. docs/lvivimport-current-import.md.

type Node = Record<string, unknown>;

export type GoodsOptions = {
  priceType?: string; // номер типу ціни: "1" або "price_tier_1" (як на lvivimport.com — типово 1)
  imageBase?: string; // тека з фото; типово images_backup/ поруч із файлом вивантаження
};

// Службова категорія 1С, яку lvivimport.com не показує (catId() повертає для неї порожньо)
const HIDDEN_CATEGORY = "ae67cc39-3241-11ec-8102-001e67f8ed26";
const DEFAULT_PRICE_TYPE = "1";
// Підкатегорії-рубрики, які не є брендами
const NOT_BRANDS = new Set(["tea", "coffe", "coffee", "cappuccino", "horeca"]);

// «12.КАВА І ЧАЙ» → номер для сортування 12 і назва «Кава і чай»
function categoryName(raw: string): { name: string; order?: number } {
  const m = raw.trim().match(/^(\d+)\.\s*(.*)$/);
  const text = (m ? m[2] : raw).trim().replace(/\s+/g, " ").toLocaleLowerCase("uk");
  return { name: text.charAt(0).toLocaleUpperCase("uk") + text.slice(1), order: m ? Number(m[1]) : undefined };
}

// Фото на сервері лежать як .jpeg: productImage() міняє jpg/png на jpeg
const imageFile = (name: string) => name.trim().replace(/\.(jpe?g|png)$/i, ".jpeg");

// «… 4TEA 220g ск/б» → «220 г»
function weightFromName(name: string): string | undefined {
  const m = name.match(/(\d+(?:[.,]\d+)?)\s?(g|г|kg|кг|ml|мл|l|л)(?![\p{L}])/iu);
  if (!m) return undefined;
  const unit = ({ g: "г", kg: "кг", ml: "мл", l: "л" } as Record<string, string>)[m[2].toLowerCase()] ?? m[2].toLowerCase();
  return `${m[1].replace(".", ",")} ${unit}`;
}

// Слово в назві товару окремо, а не частиною іншого: TEA ≠ 4TEA
function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu").test(text);
}

const flag = (v: unknown) => (str(v) === undefined ? undefined : Number(str(v)) > 0);

export function parseGoods(text: string, sourceUrl?: string, opts: GoodsOptions = {}): RawCatalog {
  const doc = parseXml(text, ["cat", "product", "image"]);
  const root = doc.goods as Node | undefined;
  if (!root) throw new Error("Не знайдено <goods>");

  const tier = (opts.priceType?.trim() || DEFAULT_PRICE_TYPE).replace(/^price_tier_/i, "");
  if (!/^\d+$/.test(tier)) throw new Error(`Тип ціни «${opts.priceType}»: очікується номер, напр. 1 або price_tier_1`);
  const priceTag = `price_tier_${tier}`;

  const cats = asArray((root.categories as Node | undefined)?.cat as Node[]).filter((c) => str(c.category_id) !== HIDDEN_CATEGORY);
  const known = new Set(cats.map((c) => str(c.category_id)));
  const categories = cats.flatMap((c, i) => {
    const id = str(c.category_id);
    const raw = str(c.name);
    if (!id || !raw) return [];
    const { name, order } = categoryName(raw);
    const parentId = str(c.parent_id);
    // без номера — після пронумерованих, у порядку файлу
    return [{ id, name, parentId: parentId && known.has(parentId) ? parentId : undefined, sortOrder: order ?? 1000 + i }];
  });

  // Бренд окремим полем у файлі не передається. Підкатегорії 1С здебільшого і є брендами
  // («Макарони > Tomadini»), а верхні категорії починаються з бренду («Messis соки»).
  // Кандидат — назва категорії (без «2» в кінці) або її перше латинське слово; приймаємо,
  // лише якщо він стоїть у назві товару окремим словом: «Макарони TOMADINI 500g» → Tomadini.
  const catNames = new Map(categories.map((c) => [c.id, c.name]));
  const parentOf = new Map(categories.map((c) => [c.id, c.parentId]));
  const brandFor = (categoryId: string | undefined, productName: string) => {
    for (let id = categoryId; id; id = parentOf.get(id)) {
      const name = catNames.get(id)?.replace(/\s+\d+$/, "") ?? "";
      for (const candidate of [name, name.split(" ")[0]]) {
        if (!/^[a-z][a-z0-9 !'&.-]*$/i.test(candidate) || NOT_BRANDS.has(candidate.toLowerCase())) continue;
        if (hasWord(productName, candidate)) {
          return candidate.replace(/(^|\s)\p{L}/gu, (c) => c.toLocaleUpperCase("uk"));
        }
      }
    }
    return undefined;
  };

  const imageBase = opts.imageBase ?? (sourceUrl ? absoluteUrl("images_backup/", sourceUrl) : "images_backup/");

  const products = asArray((root.products as Node | undefined)?.product as Node[]).map((p) => {
    const name = str(p.name) ?? "";
    const categoryId = str(p.category_id);
    const unitsPerBox = toPositiveInt(str(p.qty));
    const tierPrice = toPrice(str(p[priceTag]));
    const salePrice = flag(p.discount) ? toPrice(str(p.sale_pice)) : undefined;
    const onSale = salePrice !== undefined && salePrice > 0 && (tierPrice === undefined || salePrice < tierPrice);
    const images = asArray(p.images && (p.images as Node).image)
      .flatMap((v) => (str(v) ?? "").split(","))
      .map((f) => f.trim())
      .filter(Boolean)
      .map((f) => (/^https?:\/\//i.test(f) ? f : imageBase + imageFile(f)));

    return {
      id: str(p.uuid),
      sku: str(p.code),
      name,
      categoryId: categoryId && known.has(categoryId) ? categoryId : undefined,
      brand: brandFor(categoryId, name),
      description: htmlToText(str(p.description)),
      netWeight: weightFromName(name),
      unitsPerBox,
      unit: "шт.",
      inStock: flag(p.ammount) ?? false,
      popular: flag(p.top),
      isNew: flag(p.new),
      sale: onSale || flag(p.discount) || undefined,
      barcode: str(p.barcode),
      // «Від 1 шт» лише для позначених from_piece, інакше — від ящика
      minOrder: flag(p.from_piece) ? 1 : unitsPerBox,
      price: onSale ? salePrice : tierPrice,
      oldPrice: onSale ? tierPrice : undefined,
      images,
    };
  });

  // Товари з рубрик «Інші ТМ» тощо: шукаємо в назві бренди, вже знайдені в каталозі («Ананас HELCOM» → Helcom)
  const brands = [...new Set(products.map((p) => p.brand).filter((b): b is string => !!b))].sort((a, b) => b.length - a.length);
  for (const p of products) p.brand ??= brands.find((b) => hasWord(p.name, b));

  return { fullExport: true, categories, products };
}
