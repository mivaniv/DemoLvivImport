import type { MetadataRoute } from "next";

// Без даних — статична в обох режимах (статичний експорт цього вимагає)
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.SITE_URL || "https://lvivimport.com").replace(/\/$/, "") + (process.env.NEXT_PUBLIC_BASE_PATH ?? "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/cart", "/price-list"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
