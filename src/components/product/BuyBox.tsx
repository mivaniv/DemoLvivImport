"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRequest, type RequestItem } from "@/components/request/RequestProvider";
import { QuantityStepper } from "@/components/ui/QuantityStepper";

// Кількість у штуках і коробках пов'язані: зміна коробок перераховує штуки.
export function BuyBox({ item, unit }: { item: Omit<RequestItem, "quantity">; unit: string }) {
  const perBox = item.unitsPerBox && item.unitsPerBox > 0 ? item.unitsPerBox : null;
  const { add } = useRequest();
  const router = useRouter();
  const [qty, setQty] = useState(perBox ?? 1);
  const [added, setAdded] = useState(false);
  const boxes = perBox ? Math.ceil(qty / perBox) : 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold">Кількість</p>
        <QuantityStepper value={qty} onChange={setQty} suffix={unit} label="кількість, штук" />
      </div>
      {perBox && (
        <div>
          <p className="mb-2 text-sm font-semibold">Кількість коробок</p>
          <QuantityStepper
            value={boxes}
            onChange={(b) => setQty(b * perBox)}
            suffix={`(${perBox} ${unit})`}
            label="кількість коробок"
          />
          {qty % perBox !== 0 && (
            <p className="mt-2 text-xs text-amber-700">
              Неповна коробка: {qty % perBox} {unit} понад {Math.floor(qty / perBox)} кор.
            </p>
          )}
        </div>
      )}
      <div className="space-y-3 pt-1">
        <button
          type="button"
          onClick={() => {
            add(item, qty);
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
          }}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-white transition ${
            added ? "bg-emerald-600" : "bg-brand-600 hover:bg-brand-700"
          }`}
        >
          {added ? <Check className="size-5" /> : <ShoppingCart className="size-5" />}
          {added ? "Додано до заявки" : "Додати до заявки"}
        </button>
        <button
          type="button"
          onClick={() => {
            add(item, qty);
            router.push("/request");
          }}
          className="h-12 w-full rounded-xl border border-brand-600 font-semibold text-brand-600 transition hover:bg-brand-50"
        >
          Запитати ціну
        </button>
      </div>
    </div>
  );
}
