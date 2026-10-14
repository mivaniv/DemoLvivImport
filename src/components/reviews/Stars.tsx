import { Star } from "lucide-react";

export function Stars({ rating, className = "size-4" }: { rating: number; className?: string }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`Оцінка ${rating} з 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${className} ${i <= Math.round(rating) ? "fill-gold text-gold" : "fill-line text-line"}`} />
      ))}
    </span>
  );
}
