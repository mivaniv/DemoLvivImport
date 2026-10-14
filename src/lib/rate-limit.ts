import "server-only";

// Просте обмеження частоти в пам'яті процесу (вхід, форми). Для одного сервера цього досить;
// при кількох екземплярах сайту лічильник варто перенести в базу чи Redis.

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
    }
    return true;
  }
  bucket.count++;
  return bucket.count <= limit;
}
