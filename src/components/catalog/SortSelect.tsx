"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { catalogHref, type CatalogState, type SortKey } from "@/lib/catalog-params";

const LABELS: Record<SortKey, string> = {
  popular: "За популярністю",
  name_asc: "Назва: А–Я",
  name_desc: "Назва: Я–А",
  new: "Спершу нові",
};

export function SortSelect({ state }: { state: CatalogState }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="hidden sm:inline">Сортування:</span>
      <span className="relative">
        <select
          value={state.sort}
          onChange={(e) => router.push(catalogHref(state, { sort: e.target.value as SortKey }))}
          className="h-9 appearance-none rounded-lg border border-line bg-white pl-3 pr-9 text-sm font-medium text-ink outline-none focus:border-brand-500"
        >
          {Object.entries(LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      </span>
    </label>
  );
}
