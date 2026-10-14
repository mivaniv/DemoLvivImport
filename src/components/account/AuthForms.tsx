"use client";

import Link from "next/link";
import { useActionState } from "react";
import { changePassword, login, register, requestPasswordReset, resetPassword, updateProfile } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/form-state";
import { errorOf, Field, FormMessage, Honeypot, SubmitButton, valueOf } from "@/components/ui/form";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";

const fieldFor = (state: FormState) => (name: string) => ({ defaultValue: valueOf(state, name), error: errorOf(state, name) });

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(login, null);
  const f = fieldFor(state);
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field name="email" label="Логін або Email" type="email" required autoComplete="email" {...f("email")} />
      <Field name="password" label="Пароль" type="password" required autoComplete="current-password" />
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">Сесія діє 30 днів</span>
        <Link href="/account/lost-password" className="font-medium text-brand-600 hover:underline">
          Забули ваш пароль?
        </Link>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingLabel="Входимо…">Увійти</SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState<FormState, FormData>(register, null);
  const f = fieldFor(state);
  return (
    <form action={action} className="relative grid gap-4 sm:grid-cols-2">
      <Honeypot />
      <Field name="company" label="Компанія / ФОП" required autoComplete="organization" className="sm:col-span-2" {...f("company")} />
      <Field name="edrpou" label="Код ЄДРПОУ або ІПН" required inputMode="numeric" {...f("edrpou")} />
      <Field name="city" label="Місто" required autoComplete="address-level2" {...f("city")} />
      <Field name="contactName" label="Контактна особа" required autoComplete="name" {...f("contactName")} />
      <Field name="phone" label="Телефон" type="tel" required autoComplete="tel" placeholder="+380" {...f("phone")} />
      <Field name="email" label="Email (логін)" type="email" required autoComplete="email" className="sm:col-span-2" {...f("email")} />
      <Field name="password" label="Пароль" type="password" required autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} hint={`Щонайменше ${PASSWORD_MIN_LENGTH} символів`} error={errorOf(state, "password")} />
      <Field name="password2" label="Повторіть пароль" type="password" required autoComplete="new-password" error={errorOf(state, "password2")} />
      <div className="space-y-3 sm:col-span-2">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="consent" className="mt-1 size-4 accent-brand-600" defaultChecked={valueOf(state, "consent") === "on"} />
          <span>
            Погоджуюсь з <Link href="/terms-of-use" className="text-brand-600 hover:underline">умовами використання</Link> та{" "}
            <Link href="/privacy-policy" className="text-brand-600 hover:underline">політикою конфіденційності</Link>
          </span>
        </label>
        {errorOf(state, "consent") && <span className="block text-xs text-red-600">{errorOf(state, "consent")}</span>}
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Надсилаємо заявку…">Надіслати заявку</SubmitButton>
      </div>
    </form>
  );
}

export function LostPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4">
      <Field name="email" label="Email" type="email" required autoComplete="email" {...fieldFor(state)("email")} />
      <FormMessage state={state} />
      <SubmitButton className="w-full">Надіслати посилання</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetPassword, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field name="password" label="Новий пароль" type="password" required autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} error={errorOf(state, "password")} />
      <Field name="password2" label="Повторіть пароль" type="password" required autoComplete="new-password" error={errorOf(state, "password2")} />
      <FormMessage state={state} />
      <SubmitButton className="w-full">Зберегти пароль</SubmitButton>
    </form>
  );
}

export function ProfileForm({ initial }: { initial: Record<string, string> }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfile, null);
  const v = (name: string) => valueOf(state, name) ?? initial[name];
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field name="company" label="Компанія / ФОП" required className="sm:col-span-2" defaultValue={v("company")} error={errorOf(state, "company")} />
      <Field name="edrpou" label="Код ЄДРПОУ або ІПН" required defaultValue={v("edrpou")} error={errorOf(state, "edrpou")} />
      <Field name="city" label="Місто" defaultValue={v("city")} error={errorOf(state, "city")} />
      <Field name="contactName" label="Контактна особа" required defaultValue={v("contactName")} error={errorOf(state, "contactName")} />
      <Field name="phone" label="Телефон" type="tel" required defaultValue={v("phone")} error={errorOf(state, "phone")} />
      <div className="space-y-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Зберігаємо…">Зберегти</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePassword, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3">
      <Field name="current" label="Поточний пароль" type="password" required autoComplete="current-password" error={errorOf(state, "current")} />
      <Field name="password" label="Новий пароль" type="password" required autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} error={errorOf(state, "password")} />
      <Field name="password2" label="Повторіть новий" type="password" required autoComplete="new-password" error={errorOf(state, "password2")} />
      <div className="space-y-3 sm:col-span-3">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="Змінюємо…">Змінити пароль</SubmitButton>
      </div>
    </form>
  );
}
