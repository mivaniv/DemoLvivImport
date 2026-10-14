import { applyParam, fieldFor, htmlToText, toPrice, type MappedFields } from "../mapping";
import { absoluteUrl, asArray, parseXml, str } from "./xml";
import type { RawCatalog } from "./types";

// CommerceML 2 — стандартний обмін 1С із сайтами (<КоммерческаяИнформация>).
// Підтримуємо: Классификатор (групи, властивості), Каталог (товари) і, якщо є в тому ж файлі,
// ПакетПредложений (залишки). Атрибут СодержитТолькоИзменения визначає, чи файл повний.

type Node = Record<string, unknown>;

export function parseCommerceMl(text: string, sourceUrl?: string, opts: { priceType?: string } = {}): RawCatalog {
  const doc = parseXml(text, [
    "Группа", "Товар", "Картинка", "Ид", "Свойство", "Справочник",
    "ЗначенияСвойства", "ЗначениеРеквизита", "Предложение", "Цена", "ТипЦены", "Штрихкод",
  ]);
  const root = doc["КоммерческаяИнформация"] as Node | undefined;
  if (!root) throw new Error("CommerceML: не знайдено <КоммерческаяИнформация>");

  const classifier = root["Классификатор"] as Node | undefined;
  const catalog = root["Каталог"] as Node | undefined;
  const offersPack = root["ПакетПредложений"] as Node | undefined;

  // Групи вкладені одна в одну — розгортаємо в плаский список з parentId.
  const categories: RawCatalog["categories"] = [];
  const walk = (groups: Node[] | undefined, parentId?: string) => {
    for (const g of asArray(groups)) {
      const id = str(asArray(g["Ид"])[0]);
      const name = str(g["Наименование"]);
      if (id && name) categories.push({ id, name, parentId, sortOrder: categories.length });
      walk((g["Группы"] as Node | undefined)?.["Группа"] as Node[], id);
    }
  };
  walk((classifier?.["Группы"] as Node | undefined)?.["Группа"] as Node[]);

  // Довідник властивостей: Ид → назва, і значення-довідники Ид → текст.
  const props = new Map<string, { name: string; values: Map<string, string> }>();
  for (const p of asArray((classifier?.["Свойства"] as Node | undefined)?.["Свойство"] as Node[])) {
    const id = str(asArray(p["Ид"])[0]);
    const name = str(p["Наименование"]);
    if (!id || !name) continue;
    const values = new Map<string, string>();
    for (const v of asArray((p["ВариантыЗначений"] as Node | undefined)?.["Справочник"] as Node[])) {
      const vid = str(v["ИдЗначения"]);
      const val = str(v["Значение"]);
      if (vid && val) values.set(vid, val);
    }
    props.set(id, { name, values });
  }

  // Тип ціни: Ид або назва з налаштувань; інакше — перший тип у пакеті пропозицій.
  const priceTypes = asArray((offersPack?.["ТипыЦен"] as Node | undefined)?.["ТипЦены"] as Node[]).map((t) => ({
    id: str(asArray(t["Ид"])[0]),
    name: str(t["Наименование"]),
  }));
  const wanted = opts.priceType?.trim().toLocaleLowerCase("uk");
  const priceTypeId = wanted
    ? priceTypes.find((t) => t.id?.toLocaleLowerCase("uk") === wanted || t.name?.toLocaleLowerCase("uk") === wanted)?.id
    : priceTypes[0]?.id;
  if (wanted && priceTypes.length > 0 && !priceTypeId) {
    throw new Error(`Тип ціни «${opts.priceType}» не знайдено. Є: ${priceTypes.map((t) => t.name ?? t.id).join(", ")}`);
  }

  // Залишки й ціни з пропозицій; Ид пропозиції може бути «товар#характеристика».
  const stock = new Map<string, number>();
  const prices = new Map<string, number>();
  for (const o of asArray((offersPack?.["Предложения"] as Node | undefined)?.["Предложение"] as Node[])) {
    const id = str(asArray(o["Ид"])[0])?.split("#")[0];
    if (!id) continue;
    const qty = Number.parseFloat((str(o["Количество"]) ?? "").replace(",", "."));
    if (Number.isFinite(qty)) stock.set(id, (stock.get(id) ?? 0) + qty);
    const offerPrices = asArray((o["Цены"] as Node | undefined)?.["Цена"] as Node[]);
    const chosen = offerPrices.find((p) => !priceTypeId || str(p["ИдТипаЦены"]) === priceTypeId) ?? (priceTypeId ? undefined : offerPrices[0]);
    const value = toPrice(str(chosen?.["ЦенаЗаЕдиницу"]));
    // для характеристик беремо мінімальну ціну
    if (value !== undefined) prices.set(id, Math.min(prices.get(id) ?? Infinity, value));
  }

  const products = asArray((catalog?.["Товары"] as Node | undefined)?.["Товар"] as Node[])
    // Позначені на видалення не імпортуємо: у повному файлі прибирання їх приховає.
    .filter((t) => str(t["@_Статус"]) !== "Удален" && str(t["ПометкаУдаления"]) !== "true")
    .map((t) => {
      const id = str(asArray(t["Ид"])[0])?.split("#")[0];
      const fields: MappedFields = {
        brand: str((t["Изготовитель"] as Node | undefined)?.["Наименование"]),
        barcode: str(asArray(t["Штрихкод"])[0]),
        attributes: [],
      };
      const assign = (name: string, value: string) => applyParam(fields, name, value);

      for (const v of asArray((t["ЗначенияСвойств"] as Node | undefined)?.["ЗначенияСвойства"] as Node[])) {
        const prop = props.get(str(asArray(v["Ид"])[0]) ?? "");
        const raw = str(v["Значение"]);
        if (!prop || !raw) continue;
        assign(prop.name, prop.values.get(raw) ?? raw);
      }
      // Службові реквізити 1С (ВидНоменклатуры, ТипНоменклатуры…) на сайті не показуємо, крім відомих полів.
      for (const r of asArray((t["ЗначенияРеквизитов"] as Node | undefined)?.["ЗначениеРеквизита"] as Node[])) {
        const name = str(r["Наименование"]);
        const value = str(r["Значение"]);
        if (name && value && fieldFor(name)) assign(name, value);
      }

      const qty = id ? stock.get(id) : undefined;
      const unit = str(t["БазоваяЕдиница"]);
      return {
        id,
        sku: str(t["Артикул"]),
        name: str(t["Наименование"]) ?? "",
        categoryId: str(asArray((t["Группы"] as Node | undefined)?.["Ид"])[0]),
        description: htmlToText(str(t["Описание"])),
        ...fields,
        price: id ? prices.get(id) : undefined,
        unit: unit ? (unit.endsWith(".") ? unit : `${unit}.`) : undefined,
        stockQty: qty !== undefined ? Math.max(0, Math.trunc(qty)) : undefined,
        images: asArray(t["Картинка"]).map(str).filter((u): u is string => !!u).map((u) => absoluteUrl(u, sourceUrl)),
      };
    });

  const onlyChanges = str(catalog?.["@_СодержитТолькоИзменения"]) === "true";
  return { fullExport: Boolean(catalog) && !onlyChanges, categories, products };
}
