// Мапа сайту (/sitemap.xml) — як на lvivimport.com. Спільна розмітка для повної й статичної версії.
const STATIC_PAGES = [
  "", "/catalog", "/promo", "/new-products", "/popular", "/brands", "/about", "/reviews", "/contacts",
  "/payment-and-delivery", "/exchange-and-return", "/terms-of-use", "/privacy-policy",
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function sitemapResponse(productSlugs: string[], trailingSlash = false) {
  const base = (process.env.SITE_URL || "https://lvivimport.com").replace(/\/$/, "") + (process.env.NEXT_PUBLIC_BASE_PATH ?? "");
  const url = (p: string) => `${base}${p}${trailingSlash && p ? "/" : ""}`;
  const entries = [
    ...STATIC_PAGES.map((p) => ({ loc: url(p), freq: "weekly", priority: p === "" ? "1.0" : "0.7" })),
    ...productSlugs.map((s) => ({ loc: url(`/product/${s}`), freq: "daily", priority: "0.6" })),
  ];
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.map((e) => `  <url><loc>${esc(e.loc)}</loc><changefreq>${e.freq}</changefreq><priority>${e.priority}</priority></url>`).join("\n") +
    "\n</urlset>\n";
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
