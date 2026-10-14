import { applyParam, htmlToText, toPrice, type MappedFields } from "../mapping";
import { absoluteUrl, asArray, parseXml, str } from "./xml";
import type { RawCatalog } from "./types";

// YML (Yandex Market Language): <yml_catalog><shop><categories/><offers/></shop></yml_catalog>.
// YML завжди містить увесь каталог, тому fullExport = true.

type Node = Record<string, unknown>;

export function parseYml(text: string, sourceUrl?: string): RawCatalog {
  const doc = parseXml(text, ["category", "offer", "picture", "param", "barcode"]);
  const shop = (doc.yml_catalog as Node | undefined)?.shop as Node | undefined;
  if (!shop) throw new Error("YML: не знайдено <yml_catalog><shop>");

  const categories = asArray((shop.categories as Node | undefined)?.category as Node[]).map((c, i) => ({
    id: str(c["@_id"]) ?? "",
    name: str(c) ?? "",
    parentId: str(c["@_parentId"]),
    sortOrder: i,
  }));

  const products = asArray((shop.offers as Node | undefined)?.offer as Node[]).map((o) => {
    const fields: MappedFields = {
      netWeight: str(o.weight) ? `${str(o.weight)} кг` : undefined,
      brand: str(o.vendor),
      barcode: str(asArray(o.barcode)[0]),
      minOrder: undefined,
      attributes: [],
    };
    for (const p of asArray(o.param as Node[])) {
      const name = str(p["@_name"]);
      const unit = str(p["@_unit"]);
      const value = str(p);
      if (name && value) applyParam(fields, name, unit ? `${value} ${unit}` : value);
    }

    // type="vendor.model": назва складається з префікса, виробника й моделі
    const name = str(o.name) ?? [str(o.typePrefix), str(o.vendor), str(o.model)].filter(Boolean).join(" ");
    const available = str(o["@_available"]);
    const qty = str(o.count) ?? str(o.quantity) ?? str(o.stock_quantity);
    const price = toPrice(str(o.price));
    const oldPrice = toPrice(str(o.oldprice));

    return {
      id: str(o["@_id"]),
      sku: str(o.vendorCode),
      name,
      categoryId: str(o.categoryId),
      description: htmlToText(str(o.description)),
      ...fields,
      minOrder: fields.minOrder ?? (str(o.min_quantity) ? Number.parseInt(str(o.min_quantity)!, 10) || undefined : undefined),
      inStock: available === undefined ? undefined : available === "true",
      stockQty: qty !== undefined ? Math.max(0, Math.trunc(Number(qty)) || 0) : undefined,
      price,
      oldPrice: oldPrice !== undefined && price !== undefined && oldPrice > price ? oldPrice : undefined,
      // Стара ціна вища за поточну — товар в акції
      sale: fields.sale ?? (oldPrice !== undefined && price !== undefined && oldPrice > price ? true : undefined),
      images: asArray(o.picture).map(str).filter((u): u is string => !!u).map((u) => absoluteUrl(u, sourceUrl)),
    };
  });

  return { fullExport: true, categories, products };
}
