import snapshot from "@/data/catalog-snapshot.json";
import { sitemapResponse } from "@/lib/sitemap-xml";

// Статична збірка (GitHub Pages): файл генерується під час збірки зі знімка.
export const dynamic = "force-static";

export function GET() {
  return sitemapResponse(snapshot.products.map((p) => p.slug), true);
}
