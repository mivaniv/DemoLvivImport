// Дерево категорій з 1С (розділи → підкатегорії-бренди) для каталогу й головної.
// Чисті функції без доступу до даних: їх використовують і catalog.ts (база), і catalog.static.ts (знімок).

export type FlatCategory = {
  id: number;
  slug: string;
  name: string;
  parentId: number | null;
  sortOrder: number;
  ownCount: number; // товари безпосередньо в категорії
  image?: string; // фото першого товару категорії
};

export type CategoryNode = {
  id: number;
  slug: string;
  name: string;
  parentId: number | null;
  depth: number;
  // Разом із підкатегоріями. Форма як у Prisma _count — так її вже читають сторінки.
  _count: { products: number };
  products: { images: { url: string }[] }[];
};

// Плаский список у порядку обходу дерева (розділ, його підкатегорії, наступний розділ…).
// Категорії без товарів (з урахуванням підкатегорій) не показуються.
export function buildCategoryTree(flat: FlatCategory[]): CategoryNode[] {
  const ids = new Set(flat.map((c) => c.id));
  const children = new Map<number | null, FlatCategory[]>();
  for (const c of flat) {
    const parent = c.parentId !== null && ids.has(c.parentId) ? c.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), c]);
  }
  for (const list of children.values()) list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "uk"));

  const out: CategoryNode[] = [];
  const visit = (c: FlatCategory, depth: number, seen: Set<number>): { total: number; image?: string } => {
    if (seen.has(c.id)) return { total: 0 }; // захист від циклу в даних 1С
    seen.add(c.id);
    const node: CategoryNode = { id: c.id, slug: c.slug, name: c.name, parentId: depth ? c.parentId : null, depth, _count: { products: 0 }, products: [] };
    const at = out.push(node) - 1;
    let total = c.ownCount;
    let image = c.image;
    for (const child of children.get(c.id) ?? []) {
      const r = visit(child, depth + 1, seen);
      total += r.total;
      image ??= r.image;
    }
    if (total === 0) out.splice(at); // разом із порожніми підкатегоріями, що встигли додатися
    else {
      node._count.products = total;
      node.products = image ? [{ images: [{ url: image }] }] : [];
    }
    return { total, image };
  };
  const seen = new Set<number>();
  for (const root of children.get(null) ?? []) visit(root, 0, seen);
  return out;
}

// Категорія та всі її підкатегорії: фільтр «Макарони» показує й Barilla, і Tomadini.
export function categoryScope(flat: Pick<FlatCategory, "id" | "slug" | "parentId">[], slug: string): number[] {
  const root = flat.find((c) => c.slug === slug);
  if (!root) return [];
  const result = [root.id];
  for (let i = 0; i < result.length; i++) {
    for (const c of flat) if (c.parentId === result[i] && !result.includes(c.id)) result.push(c.id);
  }
  return result;
}
