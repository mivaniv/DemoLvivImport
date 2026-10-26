"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { describeQty, minQty, nextHint, orderStep, shortQty } from "@/lib/request-cart";
import { useRequestCart } from "./useRequestCart";

type Product = {
  slug: string;
  sku?: string | null;
  name: string;
  unit: string;
  unitsPerBox: number | null;
  minOrder: number;
  images: { url: string }[];
};

// Кошик-заявка (каталог без цін): «У кошик» на картці, а для доданого товару — «− 2 ящ. +» з підказкою.
export function AddToRequest({ product, size = "sm" }: { product: Product; size?: "sm" | "lg" }) {
  const { items, ready, add, setQty, remove } = useRequestCart();
  const item = items.find((i) => i.slug === product.slug);
  const lg = size === "lg";
  const h = lg ? "h-12" : "h-9";

  if (!item) {
    return (
      <button
        type="button"
        disabled={!ready}
        onClick={() =>
          add({
            slug: product.slug,
            sku: product.sku ?? null,
            name: product.name,
            image: product.images[0]?.url ?? null,
            unit: product.unit,
            unitsPerBox: product.unitsPerBox,
            minOrder: product.minOrder,
          })
        }
        className={`flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 ${h} ${lg ? "" : "text-sm"}`}
      >
        <ShoppingCart className="size-4" /> У кошик
      </button>
    );
  }

  const atMin = item.qty <= minQty(item);
  const btn = `grid ${h} ${lg ? "w-12" : "w-9"} shrink-0 place-items-center text-brand-700 transition hover:text-brand-900`;
  return (
    <div className="space-y-1.5">
      <div className={`flex items-center rounded-xl border border-brand-600 bg-brand-50 ${h}`}>
        <button
          type="button"
          className={btn}
          onClick={() => (atMin ? remove(item.slug) : setQty(item.slug, item.qty - orderStep(item)))}
          aria-label={atMin ? `Прибрати з кошика: ${item.name}` : `Зменшити: ${item.name}`}
        >
          {atMin ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
        </button>
        <span className={`flex-1 text-center font-bold text-brand-700 ${lg ? "" : "text-sm"}`} aria-live="polite">
          {lg ? describeQty(item, item.qty) : shortQty(item, item.qty)}
        </span>
        <button type="button" className={btn} onClick={() => setQty(item.slug, item.qty + orderStep(item))} aria-label={`Збільшити: ${item.name}`}>
          <Plus className="size-4" />
        </button>
      </div>
      <p className={`${lg ? "text-xs" : "text-[11px] leading-tight"} text-muted`}>{nextHint(item, item.qty)}</p>
      {lg && (
        <Link href="/cart" className="inline-flex text-sm font-semibold text-brand-600 hover:underline">
          Перейти до кошика →
        </Link>
      )}
    </div>
  );
}
