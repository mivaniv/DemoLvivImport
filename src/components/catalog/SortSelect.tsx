"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  catalogHref,
  PER_PAGE_OPTIONS,
  PRICE_SORTS,
  SORT_KEYS,
  SORT_LABELS,
  type CatalogState,
  type PerPage,
  type SortKey,
} from "@/lib/catalog-params";

function Select({ label, value, onChange, children }: { label: string; value: string | number; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="hidden sm:inline">{label}</span>
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 appearance-none rounded-lg border border-line bg-white pl-3 pr-9 text-sm font-medium text-ink outline-none focus:border-brand-500"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      </span>
    </label>
  );
}

export function SortSelect({ state, canOrder }: { state: CatalogState; canOrder: boolean }) {
  const router = useRouter();
  // Сортування за ціною — лише для тих, хто бачить ціни
  const keys = SORT_KEYS.filter((k) => canOrder || !PRICE_SORTS.includes(k));
  return (
    <Select label="Сортування:" value={state.sort} onChange={(v) => router.push(catalogHref(state, { sort: v as SortKey }))}>
      {keys.map((k) => (
        <option key={k} value={k}>
          {SORT_LABELS[k]}
        </option>
      ))}
    </Select>
  );
}

export function PerPageSelect({ state }: { state: CatalogState }) {
  const router = useRouter();
  return (
    <Select label="Показувати:" value={state.perPage} onChange={(v) => router.push(catalogHref(state, { perPage: Number(v) as PerPage }))}>
      {PER_PAGE_OPTIONS.map((n) => (
        <option key={n} value={n}>
          по {n}
        </option>
      ))}
    </Select>
  );
}
