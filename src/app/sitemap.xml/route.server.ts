import { connection } from "next/server";
import { db } from "@/lib/db";
import { sitemapResponse } from "@/lib/sitemap-xml";

// Повна версія: актуальні товари з бази на момент запиту.
export async function GET() {
  await connection();
  const rows = await db.product.findMany({ where: { isActive: true }, select: { slug: true }, orderBy: { sortOrder: "asc" } });
  return sitemapResponse(rows.map((r) => r.slug));
}
