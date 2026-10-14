"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions/form-state";

const inputCls = (error?: string) =>
  `w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${
    error ? "border-red-400" : "border-line"
  }`;

type FieldProps = {
  name: string;
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function Field({ name, label, error, required, hint, className = "", ...rest }: FieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input name={name} required={required} aria-invalid={Boolean(error)} className={`h-11 ${inputCls(error)}`} {...rest} />
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

type AreaProps = { name: string; label: string; error?: string; required?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ name, label, error, required, className = "", ...rest }: AreaProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <textarea name={name} required={required} aria-invalid={Boolean(error)} rows={4} className={`py-2.5 ${inputCls(error)}`} {...rest} />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

// Приховане поле-приманка: люди його не бачать, боти заповнюють.
export function Honeypot() {
  return (
    <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state?.message) return null;
  const ok = state.ok;
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}
    >
      {ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <CircleAlert className="mt-0.5 size-4 shrink-0" />}
      {state.message}
    </p>
  );
}

export function SubmitButton({ children, pendingLabel = "Надсилаємо…", className = "" }: { children: React.ReactNode; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

// Значення поля після невдалого надсилання (React скидає форму після дії)
export function valueOf(state: FormState, name: string): string | undefined {
  return state && !state.ok ? state.values?.[name] : undefined;
}

export function errorOf(state: FormState, name: string): string | undefined {
  return state && !state.ok ? state.fieldErrors?.[name] : undefined;
}
