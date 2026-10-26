import { describe, expect, it } from "vitest";
import { buildCategoryTree, categoryScope, type FlatCategory } from "@/lib/category-tree";

// Як у 1С lvivimport.com: розділ без власних товарів, у ньому підкатегорії-бренди
const flat: FlatCategory[] = [
  { id: 1, slug: "makarony", name: "Макарони", parentId: null, sortOrder: 10, ownCount: 0 },
  { id: 2, slug: "barilla", name: "Barilla", parentId: 1, sortOrder: 1001, ownCount: 3, image: "b.jpeg" },
  { id: 3, slug: "tomadini", name: "Tomadini", parentId: 1, sortOrder: 1002, ownCount: 2 },
  { id: 4, slug: "messis", name: "Messis соки", parentId: null, sortOrder: 1, ownCount: 1, image: "m.jpeg" },
  { id: 5, slug: "empty", name: "Порожня", parentId: 4, sortOrder: 1003, ownCount: 0 },
  { id: 6, slug: "orphan", name: "Без розділу", parentId: 99, sortOrder: 5, ownCount: 1 },
];

describe("buildCategoryTree", () => {
  const tree = buildCategoryTree(flat);

  it("порядок дерева: розділи за sortOrder, підкатегорії одразу за своїм розділом; порожні сховано", () => {
    expect(tree.map((c) => [c.slug, c.depth])).toEqual([
      ["messis", 0],
      ["orphan", 0],
      ["makarony", 0],
      ["barilla", 1],
      ["tomadini", 1],
    ]);
  });

  it("кількість і фото розділу — разом із підкатегоріями", () => {
    const pasta = tree.find((c) => c.slug === "makarony")!;
    expect(pasta._count.products).toBe(5);
    expect(pasta.products).toEqual([{ images: [{ url: "b.jpeg" }] }]);
    expect(tree.find((c) => c.slug === "tomadini")).toMatchObject({ parentId: 1, products: [] });
  });
});

describe("categoryScope", () => {
  it("категорія з усіма підкатегоріями", () => {
    expect(categoryScope(flat, "makarony")).toEqual([1, 2, 3]);
    expect(categoryScope(flat, "barilla")).toEqual([2]);
    expect(categoryScope(flat, "nope")).toEqual([]);
  });
});
