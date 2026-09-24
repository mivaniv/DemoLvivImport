"use client";

import { Minus, Plus } from "lucide-react";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  suffix?: string;
  label: string;
  size?: "sm" | "md";
};

export function QuantityStepper({ value, onChange, min = 1, suffix, label, size = "md" }: Props) {
  const h = size === "sm" ? "h-8" : "h-10";
  const btn = `${h} ${size === "sm" ? "w-8" : "w-10"} grid place-items-center text-muted transition hover:text-brand-600 disabled:opacity-40`;
  return (
    <div className="flex items-center gap-2">
      <div className={`inline-flex items-center rounded-lg border border-line bg-white ${h}`}>
        <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Зменшити: ${label}`}>
          <Minus className="size-3.5" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          value={value}
          aria-label={label}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            onChange(Number.isFinite(n) ? Math.max(min, n) : min);
          }}
          className={`${size === "sm" ? "w-9 text-sm" : "w-12"} bg-transparent text-center font-semibold outline-none`}
        />
        <button type="button" className={btn} onClick={() => onChange(value + 1)} aria-label={`Збільшити: ${label}`}>
          <Plus className="size-3.5" />
        </button>
      </div>
      {suffix && <span className="text-sm text-muted">{suffix}</span>}
    </div>
  );
}
