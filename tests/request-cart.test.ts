import { describe, expect, it } from "vitest";
import { clampQty, describeQty, minQty, nextHint, orderStep, parseRequestItems, requestLines, requestTotals } from "@/lib/request-cart";

const box = { unit: "шт.", unitsPerBox: 12, minOrder: 12 }; // від ящика (from_piece = 0)
const piece = { unit: "шт.", unitsPerBox: 8, minOrder: 1 }; // від 1 шт.

describe("кошик-заявка: кількості", () => {
  it("крок «+» — ящик для товарів від ящика, штука для решти", () => {
    expect(orderStep(box)).toBe(12);
    expect(orderStep(piece)).toBe(1);
    expect(orderStep({ unit: "шт.", unitsPerBox: null, minOrder: 6 })).toBe(1);
  });

  it("мінімум і кратність ящику", () => {
    expect(minQty(box)).toBe(12);
    expect(clampQty(box, 0)).toBe(12);
    expect(clampQty(box, 13)).toBe(24);
    expect(clampQty(box, 10_000_000)).toBe(99_996);
    expect(clampQty(piece, 0)).toBe(1);
    expect(clampQty(piece, 5)).toBe(5);
    // мінімум 6, ящик 12 → мінімум — цілий ящик
    expect(minQty({ unit: "шт.", unitsPerBox: 12, minOrder: 6 })).toBe(12);
  });

  it("підписи й підказка «+1»", () => {
    expect(describeQty(box, 36)).toBe("3 ящ. = 36 шт.");
    expect(describeQty(piece, 4)).toBe("4 шт. ≈ 0,5 ящ.");
    expect(nextHint(box, 24)).toBe("+1 ящ. (12 шт.) → 3 ящ. = 36 шт.");
    expect(nextHint(piece, 7)).toBe("+1 шт. → 8 шт. ≈ 1 ящ.");
  });

  it("підсумок і рядки листа", () => {
    const items = [
      { slug: "a", sku: "00-1", name: "Паста", image: null, ...box, qty: 24 },
      { slug: "b", sku: null, name: "Соус", image: null, ...piece, qty: 4 },
    ];
    expect(requestTotals(items)).toEqual({ lines: 2, pieces: 28, boxes: 2.5 });
    expect(requestLines(items)).toEqual(["1. Паста (00-1) — 2 ящ. = 24 шт.", "2. Соус — 4 шт. ≈ 0,5 ящ."]);
  });

  it("дані з браузера перевіряються: дублікати, сміття, кількість", () => {
    const parsed = parseRequestItems([
      { slug: "a", name: "Паста", qty: 13, unit: "шт.", unitsPerBox: 12, minOrder: 12 },
      { slug: "a", name: "Дубль", qty: 1 },
      { slug: "", name: "Без адреси", qty: 1 },
      { slug: "c", name: "Від'ємна", qty: -5 },
      "сміття",
      { slug: "d", name: "Мінімальне", qty: 1, minOrder: "x" },
    ]);
    expect(parsed.map((p) => [p.slug, p.qty])).toEqual([
      ["a", 24],
      ["d", 1],
    ]);
    expect(parseRequestItems({ not: "array" })).toEqual([]);
  });
});
