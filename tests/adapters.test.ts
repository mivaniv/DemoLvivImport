import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detectFormat, parseCatalogText } from "@/importer/adapters/detect";
import type { RawCatalog } from "@/importer/adapters/types";
import { productSchema } from "@/importer/format";
import { htmlToText } from "@/importer/mapping";

const fixture = (name: string) => readFileSync(`data/1c-sample/${name}`, "utf8");
type Product = Record<string, unknown>;

describe("detectFormat", () => {
  it("визначає формат за вмістом", () => {
    expect(detectFormat(fixture("sample.yml.xml"))).toBe("yml");
    expect(detectFormat(fixture("sample.commerceml.xml"))).toBe("commerceml");
    expect(detectFormat(fixture("catalog.json"))).toBe("json");
    expect(detectFormat("<html></html>")).toBeNull();
  });
});

describe("YML", () => {
  const { raw } = parseCatalogText(fixture("sample.yml.xml"), "http://feed.example.com/export.xml");
  const cat = raw as RawCatalog;
  const byId = new Map((cat.products as Product[]).map((p) => [p.id, p]));

  it("повний каталог і категорії з ієрархією", () => {
    expect(cat.fullExport).toBe(true);
    expect(cat.categories).toContainEqual({ id: "11", name: "Макаронні вироби", parentId: "10", sortOrder: 1 });
  });

  it("поля товару з тегів і параметрів", () => {
    expect(byId.get("YML-0001")).toMatchObject({
      sku: "BAR-PEN-500",
      name: "Макарони Barilla Penne Rigate, 500 г",
      brand: "Barilla",
      categoryId: "11",
      netWeight: "500 г",
      unitsPerBox: 12,
      inStock: true,
      stockQty: 240,
      price: 79.9,
      oldPrice: 86.5,
      sale: true,
      isNew: true,
      minOrder: 6,
      barcode: "8076809513753",
      attributes: [{ name: "Країна виробництва", value: "Італія" }],
      images: ["http://localhost:4100/images/penne.svg", "http://localhost:4100/images/penne-2.svg"],
    });
  });

  it("HTML в описі перетворюється на текст", () => {
    expect(byId.get("YML-0001")?.description).toBe("Класичні пере з рифленою поверхнею.\nЧас варіння — 11 хв.");
  });

  it("бренд і фасування з параметрів, якщо немає vendor", () => {
    expect(byId.get("YML-0002")).toMatchObject({ brand: "MESSIS", netWeight: "280 г", unitsPerBox: 9, price: 68.4 });
  });

  it("available=false і назва для type=vendor.model", () => {
    expect(byId.get("YML-0003")).toMatchObject({ inStock: false, stockQty: 0 });
    expect(byId.get("YML-0004")?.name).toBe("Оливки HELCOM зелені без кісточки, 340 г");
  });

  it("усі товари проходять схему імпорту", () => {
    for (const p of cat.products) expect(productSchema.safeParse(p).success).toBe(true);
  });
});

describe("CommerceML", () => {
  const { raw } = parseCatalogText(fixture("sample.commerceml.xml"), "http://1c.example.com/exchange/import.xml");
  const cat = raw as RawCatalog;
  const byId = new Map((cat.products as Product[]).map((p) => [p.id, p]));

  it("вкладені групи → плаский список з parentId", () => {
    expect(cat.categories.map((c) => [c.id, c.parentId])).toEqual([
      ["grp-food", undefined],
      ["grp-pasta", "grp-food"],
      ["grp-olives", "grp-food"],
    ]);
  });

  it("властивості-довідники, реквізити, залишки й відносні фото", () => {
    expect(byId.get("c1a2b3-0001")).toMatchObject({
      sku: "BAR-FUS-500",
      brand: "Barilla",
      categoryId: "grp-pasta",
      unitsPerBox: 12,
      netWeight: "0,5 кг",
      unit: "шт.",
      stockQty: 120,
      barcode: "8076808150546",
      price: 99,
      attributes: [{ name: "Країна виробництва", value: "Італія" }],
      images: ["http://1c.example.com/exchange/import_files/c1/fusilli.jpg"],
    });
  });

  it("залишки характеристик сумуються, позначені на видалення пропускаються", () => {
    expect(byId.get("c1a2b3-0002")?.stockQty).toBe(8);
    expect(byId.has("c1a2b3-0003")).toBe(false);
  });

  it("тип ціни з налаштувань (Ид або назва)", () => {
    const text = fixture("sample.commerceml.xml");
    const pick = (priceType: string) => ((parseCatalogText(text, undefined, { priceType }).raw as RawCatalog).products[0] as Product).price;
    expect(pick("Оптова")).toBe(79.9);
    expect(pick("pt-retail")).toBe(99);
    expect(() => parseCatalogText(text, undefined, { priceType: "VIP" })).toThrow(/не знайдено/);
  });

  it("СодержитТолькоИзменения=true → не повний каталог", () => {
    const changes = fixture("sample.commerceml.xml").replace('<Каталог СодержитТолькоИзменения="false">', '<Каталог СодержитТолькоИзменения="true">');
    expect((parseCatalogText(changes).raw as RawCatalog).fullExport).toBe(false);
  });
});

describe("htmlToText", () => {
  it("теги, сутності, переноси", () => {
    expect(htmlToText("<p>A&amp;B</p><br/>C&#8212;D")).toBe("A&B\n\nC—D");
    expect(htmlToText("   ")).toBeUndefined();
  });
});
