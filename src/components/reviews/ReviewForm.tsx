"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/form-state";
import { submitReview } from "@/app/actions/review";
import { errorOf, Field, FormMessage, Honeypot, SubmitButton, TextArea, valueOf } from "@/components/ui/form";

export function ReviewForm() {
  const [state, action] = useActionState<FormState, FormData>(submitReview, null);
  const [rating, setRating] = useState(Number(valueOf(state, "rating")) || 5);

  if (state?.ok) return <FormMessage state={state} />;

  return (
    <form action={action} className="relative space-y-4">
      <Honeypot />
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">
          Ваша загальна оцінка <span className="text-red-500">*</span>
        </legend>
        <input type="hidden" name="rating" value={rating} />
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} з 5`} aria-pressed={i === rating}>
              <Star className={`size-7 transition ${i <= rating ? "fill-gold text-gold" : "fill-line text-line hover:text-gold"}`} />
            </button>
          ))}
        </div>
        {errorOf(state, "rating") && <span className="mt-1 block text-xs text-red-600">{errorOf(state, "rating")}</span>}
      </fieldset>
      <TextArea name="text" label="Ваш відгук" required rows={5} defaultValue={valueOf(state, "text")} error={errorOf(state, "text")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="author" label="Ваше ім'я" required autoComplete="name" defaultValue={valueOf(state, "author")} error={errorOf(state, "author")} />
        <Field name="email" label="Email" type="email" autoComplete="email" hint="Не публікується" defaultValue={valueOf(state, "email")} error={errorOf(state, "email")} />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" className="mt-1 size-4 accent-brand-600" defaultChecked={valueOf(state, "consent") === "on"} />
        <span>
          Погоджуюсь з <Link href="/privacy-policy" className="text-brand-600 hover:underline">політикою конфіденційності</Link>
        </span>
      </label>
      {errorOf(state, "consent") && <span className="block text-xs text-red-600">{errorOf(state, "consent")}</span>}
      <FormMessage state={state} />
      <SubmitButton>Надіслати відгук</SubmitButton>
    </form>
  );
}
