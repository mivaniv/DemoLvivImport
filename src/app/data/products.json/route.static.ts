import snapshot from "@/data/catalog-snapshot.json";
import type { CatalogData } from "@/lib/catalog-data";

// Дані для шаблону сторінки товару (product/page.static.tsx): один файл замість окремої сторінки
// на кожен товар, тож правка шапки чи футера не змінює ~1 200 файлів на хостингу.
export const dynamic = "force-static";

export function GET() {
  const { categories, brands, products } = snapshot;
  return Response.json({ categories, brands, products } satisfies CatalogData);
}
