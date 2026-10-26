import { parseCommerceMl } from "./commerceml";
import { parseGoods } from "./goods";
import type { RawCatalog } from "./types";
import { parseYml } from "./yml";

export type SourceFormat = "json" | "yml" | "commerceml" | "goods";

// Формат визначаємо за вмістом, а не за розширенням: 1С може віддавати XML з будь-якою назвою.
export function detectFormat(text: string): SourceFormat | null {
  const head = text.slice(0, 4000).replace(/^﻿/, "").trimStart();
  if (head.startsWith("{")) return "json";
  if (/<yml_catalog[\s>]/.test(head)) return "yml";
  if (/<КоммерческаяИнформация[\s>]/.test(head)) return "commerceml";
  if (/<goods[\s>]/.test(head)) return "goods";
  return null;
}

export function parseCatalogText(text: string, sourceUrl?: string, opts: { priceType?: string; imageBase?: string } = {}): { format: SourceFormat; raw: unknown } {
  const format = detectFormat(text);
  switch (format) {
    case "json":
      return { format, raw: JSON.parse(text.replace(/^﻿/, "")) };
    case "yml":
      return { format, raw: parseYml(text, sourceUrl) satisfies RawCatalog };
    case "commerceml":
      return { format, raw: parseCommerceMl(text, sourceUrl, opts) satisfies RawCatalog };
    case "goods":
      return { format, raw: parseGoods(text, sourceUrl, opts) satisfies RawCatalog };
    default:
      throw new Error("Невідомий формат файлу: очікується YML (<yml_catalog>), CommerceML (<КоммерческаяИнформация>), вивантаження lvivimport.com (<goods>) або JSON");
  }
}
