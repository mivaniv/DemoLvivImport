"use client";

import { PhoneCall, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useActionState, useRef } from "react";
import { submitCallback } from "@/app/actions/inquiry";
import type { FormState } from "@/app/actions/form-state";
import { errorOf, Field, FormMessage, Honeypot, SubmitButton, TextArea, valueOf } from "@/components/ui/form";

// «Замовити дзвінок» (шапка) і «Отримати консультацію» (сторінка товару) — одна форма.
export function CallbackButton({
  label = "Замовити дзвінок",
  topic,
  className = "",
  icon = true,
}: {
  label?: string;
  topic?: string; // напр. назва товару для консультації
  className?: string;
  icon?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const [state, action] = useActionState<FormState, FormData>(submitCallback, null);

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={className}>
        {icon && <PhoneCall className="size-4" />}
        {label}
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 shadow-2xl backdrop:bg-navy-900/50"
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      >
        <div className="relative p-6 sm:p-7">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Закрити"
            className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas"
          >
            <X className="size-4" />
          </button>
          <h2 className="text-xl font-bold">{label}</h2>
          <p className="mt-1 text-sm text-muted">Залиште номер — менеджер зателефонує вам у робочий час.</p>
          {state?.ok ? (
            <div className="mt-5">
              <FormMessage state={state} />
            </div>
          ) : (
            <form action={action} className="relative mt-5 space-y-4">
              <Honeypot />
              <input type="hidden" name="page" value={pathname} />
              <Field name="name" label="Ім'я" required autoComplete="name" defaultValue={valueOf(state, "name")} error={errorOf(state, "name")} />
              <Field
                name="phone"
                label="Телефон"
                type="tel"
                required
                autoComplete="tel"
                placeholder="+380"
                defaultValue={valueOf(state, "phone")}
                error={errorOf(state, "phone")}
              />
              <TextArea
                name="message"
                label="Питання"
                rows={2}
                defaultValue={valueOf(state, "message") ?? (topic ? `Консультація щодо: ${topic}` : undefined)}
              />
              <FormMessage state={state} />
              <SubmitButton className="w-full">Чекаю на дзвінок</SubmitButton>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
