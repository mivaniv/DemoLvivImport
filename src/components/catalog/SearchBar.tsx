import { Search } from "lucide-react";
import Form from "next/form";
import type { CatalogState } from "@/lib/catalog-params";

// GET-форма (next/form): працює і без JavaScript, сама враховує basePath і переходить без перезавантаження.
// Приховані поля зберігають активні фільтри.
export function SearchBar({ state, autoFocus }: { state: CatalogState; autoFocus?: boolean }) {
  return (
    <Form action="/catalog" role="search" className="flex gap-2 rounded-2xl border border-line bg-white p-2 shadow-sm">
      <label className="flex flex-1 items-center gap-3 pl-3">
        <Search className="size-4 shrink-0 text-muted" />
        <span className="sr-only">Пошук</span>
        <input
          type="search"
          name="q"
          defaultValue={state.q}
          autoFocus={autoFocus}
          placeholder="Пошук товарів, брендів, категорій…"
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted/70"
        />
      </label>
      {state.category && <input type="hidden" name="category" value={state.category} />}
      {state.brands.length > 0 && <input type="hidden" name="brand" value={state.brands.join(",")} />}
      {state.inStock && <input type="hidden" name="stock" value="1" />}
      <button type="submit" className="h-10 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 sm:px-8">
        Знайти
      </button>
    </Form>
  );
}
