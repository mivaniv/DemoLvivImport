"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRequest } from "@/components/request/RequestProvider";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import type { RequestItem } from "@/components/request/RequestProvider";

// Кількість + «Запитати ціну» + кнопка кошика на картці товару.
export function CardActions({ item, unit }: { item: Omit<RequestItem, "quantity">; unit: string }) {
  const { add } = useRequest();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div className="mt-auto space-y-3 pt-3">
      <QuantityStepper value={qty} onChange={setQty} suffix={unit} label={`кількість, ${item.name}`} size="sm" />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            add(item, qty);
            router.push("/request");
          }}
          className="h-9 min-w-0 flex-1 whitespace-nowrap rounded-lg bg-brand-600 px-2 text-xs font-semibold text-white transition hover:bg-brand-700 sm:px-3 sm:text-sm"
        >
          Запитати ціну
        </button>
        <button
          type="button"
          onClick={() => {
            add(item, qty);
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
          }}
          aria-label={`Додати до заявки: ${item.name}`}
          title="Додати до заявки"
          className={`grid size-9 shrink-0 place-items-center rounded-lg border transition ${
            added ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-brand-600 text-brand-600 hover:bg-brand-50"
          }`}
        >
          {added ? <Check className="size-4" /> : <ShoppingCart className="size-4" />}
        </button>
      </div>
    </div>
  );
}
