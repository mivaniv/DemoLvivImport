import { Lock } from "lucide-react";
import Link from "next/link";
import { B2B_ENABLED } from "@/lib/features";
import { formatPrice } from "@/lib/format";

// Ціна для клієнта або запрошення увійти для гостя (як на lvivimport.com).
export function PriceTag({
  canOrder,
  price,
  oldPrice,
  unit,
  unitsPerBox,
  size = "sm",
}: {
  canOrder: boolean;
  price: number | null;
  oldPrice?: number | null;
  unit: string;
  unitsPerBox?: number | null;
  size?: "sm" | "lg";
}) {
  if (canOrder && price === null) return <p className="text-xs font-medium text-muted">Ціна уточнюється</p>;
  // Каталог без цін (B2B вимкнено): гостям нічого не показуємо замість ціни
  if (price === null && !B2B_ENABLED) return null;
  if (price === null) {
    return (
      <Link href="/account/login" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-brand-600">
        <Lock className="size-3.5" /> Ціна — після входу
      </Link>
    );
  }
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className={`font-extrabold text-ink ${size === "lg" ? "text-3xl" : "text-lg"}`}>{formatPrice(price)}</span>
        <span className="text-xs text-muted">/ {unit.replace(/\.$/, "")}</span>
        {oldPrice && oldPrice > price && <s className="text-sm text-muted">{formatPrice(oldPrice)}</s>}
      </p>
      {unitsPerBox ? (
        <p className="text-xs text-muted">
          ящик ({unitsPerBox} {unit}) — {formatPrice(price * unitsPerBox)}
        </p>
      ) : null}
    </div>
  );
}

export const GUEST_PRICE_NOTICE = "Перегляд цін та можливість замовлення доступні лише зареєстрованим користувачам";
