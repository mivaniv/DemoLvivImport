"use client";

import { CircleCheck, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useState } from "react";
import type { FormState } from "@/app/actions/form-state";
import { submitRequest } from "@/app/actions/request";
import { ProductImage } from "@/components/product/ProductImage";
import { errorOf, Field, FormMessage, Honeypot, TextArea } from "@/components/ui/form";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { plural } from "@/lib/format";
import { DELIVERY_LABELS } from "@/lib/orders";
import { byBox, describeQty, formatBoxes, minQty, nextHint, orderStep, requestTotals, type RequestItem } from "@/lib/request-cart";
import { useRequestCart } from "./useRequestCart";

// Кошик-заявка (каталог без цін): товари з localStorage + форма, яка надсилає заявку менеджеру.
export function RequestCart() {
  const { items, ready, setQty, remove, clear } = useRequestCart();
  const [state, action, pending] = useActionState<FormState, FormData>(submitRequest, null);
  const sent = state?.ok ? state : null;

  // Заявку прийнято — очищаємо кошик, лишається підтвердження
  useEffect(() => {
    if (state?.ok) clear();
  }, [state, clear]);

  if (!ready) return <div className="h-64 animate-pulse rounded-2xl bg-white ring-1 ring-line" />;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-line bg-white p-10 text-center">
        {sent ? (
          <>
            <CircleCheck className="mx-auto size-10 text-emerald-600" />
            <h2 className="mt-4 text-lg font-bold">Заявку надіслано</h2>
            <p className="mt-1 text-sm text-muted">{sent.message}</p>
          </>
        ) : (
          <>
            <ShoppingCart className="mx-auto size-10 text-brand-200" />
            <h2 className="mt-4 text-lg font-bold">Кошик порожній</h2>
            <p className="mt-1 text-sm text-muted">Додавайте товари прямо з каталогу кнопкою «У кошик» — кількість рахується ящиками.</p>
          </>
        )}
        <Link href="/catalog" className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white">
          До каталогу
        </Link>
      </div>
    );
  }

  const totals = requestTotals(items);
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section aria-label="Товари в кошику" className="h-fit rounded-2xl bg-white ring-1 ring-line">
        <ul className="divide-y divide-line">
          {items.map((i) => (
            <Line key={i.slug} item={i} onQty={(q) => setQty(i.slug, q)} onRemove={() => remove(i.slug)} />
          ))}
        </ul>
        <p className="border-t border-line px-4 py-3 text-right text-sm">
          {totals.lines} {plural(totals.lines, ["позиція", "позиції", "позицій"])} ·{" "}
          <span className="font-bold">
            {formatBoxes(totals.boxes)} ящ. = {totals.pieces} шт.
          </span>
        </p>
      </section>

      <section className="h-fit rounded-2xl bg-white p-6 ring-1 ring-line">
        <h2 className="text-lg font-bold">Заявка менеджеру</h2>
        <p className="mb-5 mt-1 text-sm text-muted">Ціни, наявність і терміни поставки менеджер підтвердить після отримання заявки.</p>
        <RequestForm items={items} state={state} action={action} pending={pending} />
      </section>
    </div>
  );
}

function Line({ item: i, onQty, onRemove }: { item: RequestItem; onQty: (qty: number) => void; onRemove: () => void }) {
  // Для товарів «від ящика» степер рахує ящики, для решти — штуки
  const step = orderStep(i);
  return (
    <li className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
      <Link href={`/product/${i.slug}`} className="relative size-16 shrink-0">
        <ProductImage src={i.image ?? undefined} alt="" sizes="64px" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/product/${i.slug}`} className="line-clamp-2 text-sm font-semibold hover:text-brand-600">
          {i.name}
        </Link>
        <p className="mt-0.5 text-xs text-muted">
          {i.sku && <>Артикул {i.sku} · </>}
          {i.unitsPerBox ? `${i.unitsPerBox} ${i.unit} у ящику` : `від ${i.minOrder} ${i.unit}`}
        </p>
      </div>
      {/* на телефоні — окремим рядком під назвою */}
      <div className="order-last w-full space-y-1 sm:order-none sm:w-52">
        <QuantityStepper
          value={i.qty / step}
          min={minQty(i) / step}
          onChange={(n) => onQty(n * step)}
          label={`кількість, ${i.name}`}
          suffix={byBox(i) ? "ящ." : i.unit}
          size="sm"
        />
        <p className="text-xs font-semibold">Разом: {describeQty(i, i.qty)}</p>
        <p className="text-[11px] leading-tight text-muted">{nextHint(i, i.qty)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Видалити ${i.name}`}
        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

type Method = keyof typeof DELIVERY_LABELS;

type FormProps = { items: RequestItem[]; state: FormState; action: (formData: FormData) => void; pending: boolean };

function RequestForm({ items, state, action, pending }: FormProps) {
  const [method, setMethod] = useState<Method>("OWN_LOGISTICS");
  const carrier = method === "NOVA_POSHTA" || method === "DELIVERY" || method === "MEEST";

  // Надсилаємо через onSubmit, а не <form action>: React тоді не скидає форму після помилки,
  // і обраний спосіб доставки та введені дані лишаються як є
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };

  return (
    <form onSubmit={submit} className="relative space-y-5">
      <Honeypot />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
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
          <Field name="deliveryCity" label="Населений пункт" required error={errorOf(state, "deliveryCity")} />
          <Field
            name="deliveryPoint"
            label={carrier ? "Номер відділення / поштомату" : "Адреса доставки"}
            required
           
            error={errorOf(state, "deliveryPoint")}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Отримувач (ПІБ)" required autoComplete="name" error={errorOf(state, "name")} />
        <Field name="phone" label="Телефон" type="tel" required autoComplete="tel" error={errorOf(state, "phone")} />
        <Field name="company" label="Компанія / ФОП" autoComplete="organization" error={errorOf(state, "company")} />
        <Field name="email" label="Email" type="email" autoComplete="email" error={errorOf(state, "email")} />
      </div>
      <TextArea name="comment" label="Коментар до заявки" rows={3} error={errorOf(state, "comment")} />

      <FormMessage state={state && !state.ok ? state : null} />
      <div className="border-t border-line pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Надсилаємо…" : "Надіслати заявку"}
        </button>
      </div>
    </form>
  );
}
