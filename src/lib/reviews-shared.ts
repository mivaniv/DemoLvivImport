// Спільне для reviews.ts (база) і reviews.static.ts (знімок).

export const REVIEWS_PER_PAGE = 10;

export type ReviewItem = { id: number; author: string; rating: number; text: string; reply: string | null; createdAt: Date };

export function summarize(items: ReviewItem[], total: number, byRating: { rating: number; count: number }[]) {
  const sum = byRating.reduce((s, r) => s + r.rating * r.count, 0);
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: byRating.find((r) => r.rating === stars)?.count ?? 0 }));
  return {
    items,
    total,
    pages: Math.max(1, Math.ceil(total / REVIEWS_PER_PAGE)),
    average: total ? Math.round((sum / total) * 10) / 10 : 0,
    distribution,
  };
}
