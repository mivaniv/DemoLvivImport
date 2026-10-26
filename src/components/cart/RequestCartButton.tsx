"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRequestCart } from "./useRequestCart";

// Кнопка кошика-заявки в шапці: лічильник позицій з localStorage
export function RequestCartButton() {
  const { items } = useRequestCart();
  return (
    <Link
      href="/cart"
      aria-label={items.length ? `Кошик: ${items.length}` : "Кошик"}
      className="relative inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white transition hover:bg-brand-700 sm:px-4"
    >
      <ShoppingCart className="size-4" />
      <span className="hidden sm:inline">Кошик</span>
      {items.length > 0 && (
        <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-navy-900 ring-2 ring-white">
          {items.length}
        </span>
      )}
    </Link>
  );
}
