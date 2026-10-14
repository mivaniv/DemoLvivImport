import { XMLParser } from "fast-xml-parser";

// Спільні налаштування розбору XML для адаптерів 1С.
// parseTagValue: false — ID на кшталт "00012" не перетворюються на числа.
export function parseXml(text: string, arrayTags: string[]) {
  const arrays = new Set(arrayTags);
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    isArray: (name) => arrays.has(name),
  }).parse(text);
}

// Значення вузла як рядок: <name>X</name> → "X"; <name attr="1">X</name> → "X".
export function str(node: unknown): string | undefined {
  if (node === undefined || node === null) return undefined;
  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
    const s = String(node).trim();
    return s || undefined;
  }
  if (typeof node === "object" && "#text" in node) return str((node as { "#text": unknown })["#text"]);
  return undefined;
}

export const asArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

// Відносні шляхи до фото (типово для CommerceML: import_files/...) розв'язуємо відносно адреси вивантаження.
export function absoluteUrl(src: string, sourceUrl?: string): string {
  if (/^https?:\/\//i.test(src) || !sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return src;
  return new URL(src, sourceUrl).toString();
}
