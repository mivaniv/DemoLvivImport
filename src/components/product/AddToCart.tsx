"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useState, useTransition } from "react";
import { addToCart } from "@/app/actions/cart";
import { QuantityStepper } from "@/components/ui/QuantityStepper";

// Кількість + «В кошик». Рендериться лише для підтверджених клієнтів.
export function AddToCart({
  productId,
  unit,
  minOrder,
  unitsPerBox,
  compact = false,
}: {
  productId: number;
  unit: string;
  minOrder: number;
  unitsPerBox?: number | null;
  compact?: boolean;
}) {
  const [qty, setQty] = useState(Math.max(minOrder, compact ? minOrder : (unitsPerBox ?? minOrder)));
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const perBox = unitsPerBox && unitsPerBox > 0 ? unitsPerBox : null;

  const submit = () =>
    start(async () => {
      const r = await addToCart(productId, qty);
      setResult(r);
      if (r.ok) setTimeout(() => setResult(null), 2000);
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <QuantityStepper value={qty} onChange={setQty} min={minOrder} suffix={unit} label="кількість, штук" size={compact ? "sm" : "md"} />
        {perBox && !compact && (
          <QuantityStepper
            value={Math.ceil(qty / perBox)}
            onChange={(b) => setQty(Math.max(minOrder, b * perBox))}
            suffix={`ящ. по ${perBox}`}
            label="кількість ящиків"
          />
        )}
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className={`flex w-full items-center justify-center gap-2 rounded-xl font-semibold text-white transition disabled:opacity-60 ${
          compact ? "h-9 text-sm" : "h-12"
        } ${result?.ok ? "bg-emerald-600" : "bg-brand-600 hover:bg-brand-700"}`}
      >
        {result?.ok ? <Check className="size-4" /> : <ShoppingCart className="size-4" />}
        {result?.ok ? "Додано в кошик" : pending ? "Додаємо…" : "В кошик"}
      </button>
      {result && !result.ok && <p className="text-xs text-red-600">{result.message}</p>}
    </div>
  );
}
