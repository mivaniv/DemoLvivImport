"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/form-state";
import { submitContact } from "@/app/actions/inquiry";
import { errorOf, Field, FormMessage, Honeypot, SubmitButton, TextArea, valueOf } from "@/components/ui/form";

// Поля — як у формі «Зворотній зв'язок» на lvivimport.com
export function ContactForm() {
  const [state, action] = useActionState<FormState, FormData>(submitContact, null);
  if (state?.ok) return <FormMessage state={state} />;

  const f = (name: string) => ({ defaultValue: valueOf(state, name), error: errorOf(state, name) });
  return (
    <form action={action} className="relative grid gap-4 sm:grid-cols-2">
      <Honeypot />
      <Field name="firstName" label="Ім'я" required autoComplete="given-name" {...f("firstName")} />
      <Field name="lastName" label="Прізвище" autoComplete="family-name" {...f("lastName")} />
      <Field name="email" label="Email" type="email" required autoComplete="email" {...f("email")} />
      <Field name="phone" label="Номер телефону" type="tel" required autoComplete="tel" placeholder="+380" {...f("phone")} />
      <Field name="organization" label="Організація" autoComplete="organization" {...f("organization")} />
      <Field name="position" label="Посада" autoComplete="organization-title" {...f("position")} />
      <TextArea name="message" label="Повідомлення" required rows={5} className="sm:col-span-2" defaultValue={valueOf(state, "message")} error={errorOf(state, "message")} />
      <div className="space-y-3 sm:col-span-2">
        <FormMessage state={state} />
        <p className="text-xs text-muted">
          Надсилаючи форму, ви погоджуєтесь з <Link href="/privacy-policy" className="text-brand-600 hover:underline">політикою конфіденційності</Link>.
        </p>
        <SubmitButton>Надіслати</SubmitButton>
      </div>
    </form>
  );
}
