"use client";

import { useActionState, useState } from "react";
import { placeOrder } from "@/app/actions/cart";
import type { FormState } from "@/app/actions/form-state";
import { errorOf, Field, FormMessage, SubmitButton, TextArea, valueOf } from "@/components/ui/form";
import { formatPrice } from "@/lib/format";
import { DELIVERY_LABELS } from "@/lib/orders";

type Method = keyof typeof DELIVERY_LABELS;

export function CheckoutForm({ total, defaults }: { total: number; defaults: { recipientName: string; recipientPhone: string; city: string } }) {
  const [state, action] = useActionState<FormState, FormData>(placeOrder, null);
  const [method, setMethod] = useState<Method>((valueOf(state, "deliveryMethod") as Method) || "OWN_LOGISTICS");
  const carrier = method === "NOVA_POSHTA" || method === "DELIVERY" || method === "MEEST";

  return (
    <form action={action} className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Спосіб доставки</legend>
        <div className="space-y-2">
          {(Object.keys(DELIVERY_LABELS) as Method[]).map((m) => (
            <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${method === m ? "border-brand-600 bg-brand-50" : "border-line hover:border-brand-200"}`}>
              <input type="radio" name="deliveryMethod" value={m} checked={method === m} onChange={() => setMethod(m)} className="accent-brand-600" />
              {DELIVERY_LABELS[m]}
            </label>
          ))}
        </div>
      </fieldset>

      {method !== "PICKUP" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="deliveryCity" label="Населений пункт" required defaultValue={valueOf(state, "deliveryCity") ?? defaults.city} error={errorOf(state, "deliveryCity")} />
          <Field
            name="deliveryPoint"
            label={carrier ? "Номер відділення / поштомату" : "Адреса доставки"}
            required
            defaultValue={valueOf(state, "deliveryPoint")}
            error={errorOf(state, "deliveryPoint")}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="recipientName" label="Отримувач" required autoComplete="name" defaultValue={valueOf(state, "recipientName") ?? defaults.recipientName} error={errorOf(state, "recipientName")} />
        <Field name="recipientPhone" label="Телефон отримувача" type="tel" required autoComplete="tel" defaultValue={valueOf(state, "recipientPhone") ?? defaults.recipientPhone} error={errorOf(state, "recipientPhone")} />
      </div>
      <TextArea name="comment" label="Коментар до замовлення" rows={3} defaultValue={valueOf(state, "comment")} />

      <p className="text-xs text-muted">Умови оплати визначаються договором про співпрацю. Менеджер підтвердить замовлення та терміни поставки.</p>
      <FormMessage state={state} />
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <p className="text-lg">
          Разом: <span className="font-extrabold">{formatPrice(total)}</span>
        </p>
        <SubmitButton pendingLabel="Оформлюємо…">Оформити замовлення</SubmitButton>
      </div>
    </form>
  );
}
