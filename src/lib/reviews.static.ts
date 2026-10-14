import snapshot from "@/data/catalog-snapshot.json";
import { REVIEWS_PER_PAGE, summarize } from "./reviews-shared";

// Статична збірка: опубліковані відгуки зі знімка; нові відгуки тут не приймаються.
export { REVIEWS_PER_PAGE };

export async function getReviewsPage(page: number) {
  const all = (snapshot.reviews ?? []).map((r) => ({ ...r, createdAt: new Date(r.createdAt) }));
  const byRating = [1, 2, 3, 4, 5].map((rating) => ({ rating, count: all.filter((r) => r.rating === rating).length }));
  return summarize(all.slice((page - 1) * REVIEWS_PER_PAGE, page * REVIEWS_PER_PAGE), all.length, byRating);
}

// У статичній збірці адреса недоступна на етапі збірки — показуємо першу сторінку.
export async function reviewsPageNumber(_searchParams: unknown) {
  return 1;
}
