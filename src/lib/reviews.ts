import { connection } from "next/server";
import { db } from "@/lib/db";
import { REVIEWS_PER_PAGE, summarize } from "./reviews-shared";

// Опубліковані відгуки. У статичній збірці підміняється reviews.static.ts (дані зі знімка).
export { REVIEWS_PER_PAGE };

export async function getReviewsPage(page: number) {
  await connection();
  const where = { status: "PUBLISHED" as const };
  const [items, total, stats] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * REVIEWS_PER_PAGE,
      take: REVIEWS_PER_PAGE,
      select: { id: true, author: true, rating: true, text: true, reply: true, createdAt: true },
    }),
    db.review.count({ where }),
    db.review.groupBy({ by: ["rating"], where, _count: true }),
  ]);
  return summarize(items, total, stats.map((s) => ({ rating: s.rating, count: s._count })));
}

export async function reviewsPageNumber(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const raw = await searchParams;
  return Math.max(1, Number.parseInt(String(raw.page ?? "1"), 10) || 1);
}
