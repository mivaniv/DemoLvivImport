"use client";

import { CircleAlert, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { removeFromCart, setCartQuantity } from "@/app/actions/cart";
import { ProductImage } from "@/components/product/ProductImage";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import type { Cart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

type Line = Cart["lines"][number];

export function CartLines({ lines }: { lines: Line[] }) {
  return (
    <ul className="divide-y divide-line">
      {lines.map((l) => (
        <CartLine key={l.productId} line={l} />
      ))}
    </ul>
  );
}

function CartLine({ line: l }: { line: Line }) {
  const [pending, start] = useTransition();
  // Локальна кількість: поле реагує одразу, а на сервер іде лише останнє значення (через 400 мс)
  const [qty, setQty] = useState(l.quantity);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (q: number) => {
    setQty(q);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => start(() => void setCartQuantity(l.productId, q)), 400);
  };

  return (
    <li className={`flex flex-wrap items-center gap-4 p-4 transition sm:flex-nowrap ${pending ? "opacity-60" : ""}`}>
      <Link href={`/product/${l.slug}`} className="relative size-16 shrink-0">
        <ProductImage src={l.image} alt="" sizes="64px" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/product/${l.slug}`} className="line-clamp-2 text-sm font-semibold hover:text-brand-600">
          {l.name}
        </Link>
        <p className="mt-0.5 text-xs text-muted">
          {l.sku && <>Артикул {l.sku} · </>}
          {l.price !== null ? `${formatPrice(l.price)} / шт.` : ""}
          {l.unitsPerBox ? ` · ≈ ${(qty / l.unitsPerBox).toLocaleString("uk-UA", { maximumFractionDigits: 1 })} ящ. по ${l.unitsPerBox}` : ""}
        </p>
        {!l.available && (
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700">
            <CircleAlert className="size-3.5" /> Зараз недоступний для замовлення — не увійде в замовлення
          </p>
        )}
      </div>
      <QuantityStepper value={qty} min={l.minOrder} onChange={change} label={`кількість, ${l.name}`} suffix="шт." size="sm" />
      <p className="w-28 text-right font-semibold">{l.available && l.price !== null ? formatPrice(l.price * qty) : "—"}</p>
      <button
        type="button"
        onClick={() => start(() => void removeFromCart(l.productId))}
        aria-label={`Видалити ${l.name}`}
        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
