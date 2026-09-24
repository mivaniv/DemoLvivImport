"use client";

import { CircleCheck, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { ProductImage } from "@/components/product/ProductImage";
import { useRequest } from "@/components/request/RequestProvider";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { submitPriceRequest, type RequestFormState } from "./actions";

export function RequestForm() {
  const { items, ready, setQuantity, remove, clear } = useRequest();
  const [state, action, pending] = useActionState<RequestFormState, FormData>(submitPriceRequest, null);

  useEffect(() => {
    if (state?.ok) clear();
  }, [state, clear]);

  if (state?.ok) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-line bg-white p-8 text-center">
        <CircleCheck className="mx-auto size-12 text-emerald-600" strokeWidth={1.5} />
        <h2 className="mt-4 text-xl font-bold">Заявку №{state.id} надіслано</h2>
        <p className="mt-2 text-sm text-muted">Менеджер зв&apos;яжеться з вами з цінами та умовами поставки найближчим робочим днем.</p>
        <Link href="/catalog" className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white">
          Повернутися до каталогу
        </Link>
      </div>
    );
  }

  if (!ready) return <div className="h-64 animate-pulse rounded-2xl bg-white" />;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-line bg-white p-10 text-center">
        <ShoppingCart className="mx-auto size-10 text-brand-200" />
        <h2 className="mt-4 text-lg font-bold">Заявка порожня</h2>
        <p className="mt-1 text-sm text-muted">Додайте товари з каталогу — ми надішлемо ціни та умови співпраці.</p>
        <Link href="/catalog" className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white">
          До каталогу
        </Link>
      </div>
    );
  }

  const err = state && !state.ok ? state.fieldErrors ?? {} : {};
  const v = state && !state.ok ? state.values : {};
  const payload = JSON.stringify(items.map(({ productId, quantity }) => ({ productId, quantity })));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <section aria-label="Товари в заявці" className="rounded-2xl border border-line bg-white">
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.productId} className="flex items-center gap-4 p-4">
              <Link href={`/product/${item.slug}`} className="relative size-16 shrink-0">
                <ProductImage src={item.image} alt="" sizes="64px" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/product/${item.slug}`} className="line-clamp-2 text-sm font-semibold hover:text-brand-600">
                  {item.name}
                </Link>
                {item.unitsPerBox ? (
                  <p className="mt-0.5 text-xs text-muted">
                    ≈ {(item.quantity / item.unitsPerBox).toLocaleString("uk-UA", { maximumFractionDigits: 1 })} кор. по {item.unitsPerBox} шт.
                  </p>
                ) : null}
              </div>
              <QuantityStepper value={item.quantity} onChange={(q) => setQuantity(item.productId, q)} label={`кількість, ${item.name}`} size="sm" />
              <button
                type="button"
                onClick={() => remove(item.productId)}
                aria-label={`Видалити ${item.name}`}
                className="grid size-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        {err.items && <p className="px-4 pb-4 text-sm text-red-600">{err.items}</p>}
      </section>

      <form action={action} className="h-fit space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold">Контактні дані</h2>
        <input type="hidden" name="items" value={payload} />
        <Field name="company" label="Компанія" required error={err.company} defaultValue={v.company} autoComplete="organization" />
        <Field name="contactName" label="Контактна особа" required error={err.contactName} defaultValue={v.contactName} autoComplete="name" />
        <Field name="phone" label="Телефон" type="tel" required error={err.phone} defaultValue={v.phone} autoComplete="tel" placeholder="+380" />
        <Field name="email" label="Email" type="email" error={err.email} defaultValue={v.email} autoComplete="email" />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Коментар</span>
          <textarea
            name="comment"
            defaultValue={v.comment}
            rows={3}
            placeholder="Місто доставки, бажані терміни, формат співпраці…"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </label>
        {state && !state.ok && state.message && <p className="text-sm text-red-600">{state.message}</p>}
        <button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-xl bg-brand-600 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Надсилаємо…" : "Надіслати заявку"}
        </button>
        <p className="text-xs text-muted">Ціни та умови надсилаємо індивідуально — залежно від обсягу та формату співпраці.</p>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  error,
  required,
  ...rest
}: { name: string; label: string; error?: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        name={name}
        required={required}
        aria-invalid={Boolean(error)}
        className={`h-11 w-full rounded-lg border px-3 text-sm outline-none focus:border-brand-500 ${error ? "border-red-400" : "border-line"}`}
        {...rest}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
