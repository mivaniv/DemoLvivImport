import { Check, ChevronLeft, ChevronRight, LayoutGrid, List, SlidersHorizontal, Truck, X } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SearchBar } from "@/components/catalog/SearchBar";
import { SortSelect } from "@/components/catalog/SortSelect";
import { ProductCard } from "@/components/product/ProductCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getBrands, getCategories, PAGE_SIZE, searchProducts } from "@/lib/catalog";
import { catalogHref, parseCatalogParams, toggle, type CatalogState } from "@/lib/catalog-params";

export const metadata: Metadata = { title: "Каталог товарів" };

export default async function CatalogPage(props: PageProps<"/catalog">) {
  const raw = await props.searchParams;
  const state = parseCatalogParams(raw);
  const [categories, brands, result] = await Promise.all([getCategories(), getBrands(), searchProducts(state)]);

  const activeCategory = categories.find((c) => c.slug === state.category);
  const hasFilters = Boolean(state.q || state.category || state.brands.length || state.inStock);
  const from = result.total === 0 ? 0 : (state.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(state.page * PAGE_SIZE, result.total);

  const filters = (
    <div className="space-y-7">
      <FilterGroup title="Категорії">
        <ul className="space-y-0.5">
          <li>
            <CategoryLink href={catalogHref(state, { category: "" })} active={!state.category} label="Усі товари" />
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <CategoryLink
                href={catalogHref(state, { category: c.slug })}
                active={state.category === c.slug}
                label={c.name}
                count={c._count.products}
              />
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Бренди">
        <ul className="space-y-1">
          {brands.map((b) => (
            <li key={b.id}>
              <CheckLink
                href={catalogHref(state, { brands: toggle(state.brands, b.slug) })}
                checked={state.brands.includes(b.slug)}
                label={b.name}
              />
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Наявність">
        <CheckLink href={catalogHref(state, { inStock: !state.inStock })} checked={state.inStock} label="В наявності" />
      </FilterGroup>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <SearchBar state={state} autoFocus={raw.focus === "search"} />

      <div className="mt-6">
        <Breadcrumbs
          items={[
            { label: "Головна", href: "/" },
            activeCategory ? { label: "Каталог", href: "/catalog" } : { label: "Каталог" },
            ...(activeCategory ? [{ label: activeCategory.name }] : []),
          ]}
        />
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{activeCategory?.name ?? "Каталог товарів"}</h1>
        {state.q && (
          <p className="mt-1 text-sm text-muted">
            Результати пошуку за запитом «<span className="font-semibold text-ink">{state.q}</span>»
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-6">
          <details className="group rounded-2xl border border-line bg-white p-5 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
              <SlidersHorizontal className="size-4" /> Фільтри
              {hasFilters && <span className="ml-auto text-xs font-medium text-brand-600">активні</span>}
            </summary>
            <div className="mt-5">{filters}</div>
          </details>
          <div className="hidden rounded-2xl border border-line bg-white p-5 lg:block">{filters}</div>
          <PromoCard />
        </aside>

        <section aria-label="Товари">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={catalogHref(state, { category: "", brands: [] })}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition ${
                !state.category && state.brands.length === 0
                  ? "bg-brand-600 text-white"
                  : "border border-line bg-white hover:border-brand-200"
              }`}
            >
              Усі товари
            </Link>
            {activeCategory && (
              <Link
                href={catalogHref(state, { category: "" })}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 text-xs font-semibold text-white"
              >
                {activeCategory.name} <X className="size-3.5" />
              </Link>
            )}
            {brands.map((b) => {
              const active = state.brands.includes(b.slug);
              return (
                <Link
                  key={b.id}
                  href={catalogHref(state, { brands: toggle(state.brands, b.slug) })}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition ${
                    active ? "bg-brand-600 text-white" : "border border-line bg-white hover:border-brand-200"
                  }`}
                >
                  {b.name}
                  {active && <X className="size-3.5" />}
                </Link>
              );
            })}
            {hasFilters && (
              <Link href="/catalog" className="ml-auto text-xs font-semibold text-brand-600 hover:text-brand-700">
                Скинути фільтри
              </Link>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-b border-line pb-4">
            <SortSelect state={state} />
            <div className="flex overflow-hidden rounded-lg border border-line bg-white">
              <ViewLink href={catalogHref(state, { view: "grid", page: state.page })} active={state.view === "grid"} label="Сітка">
                <LayoutGrid className="size-4" />
              </ViewLink>
              <ViewLink href={catalogHref(state, { view: "list", page: state.page })} active={state.view === "list"} label="Список">
                <List className="size-4" />
              </ViewLink>
            </div>
            <p className="ml-auto text-xs text-muted">
              {result.total > 0 ? `Показано ${from}–${to} з ${result.total}` : "Нічого не знайдено"}
            </p>
          </div>

          {result.items.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
              <p className="font-semibold">За цими умовами товарів не знайдено</p>
              <p className="mt-1 text-sm text-muted">Спробуйте змінити запит або скинути фільтри.</p>
              <Link href="/catalog" className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white">
                Показати всі товари
              </Link>
            </div>
          ) : state.view === "list" ? (
            <div className="mt-5 space-y-3">
              {result.items.map((p) => (
                <ProductCard key={p.id} product={p} variant="row" />
              ))}
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {result.items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {result.pages > 1 && <Pagination state={state} pages={result.pages} />}

          <div className="mt-10 flex flex-col items-start gap-5 rounded-2xl bg-brand-50 p-6 sm:flex-row sm:items-center sm:p-8">
            <Truck className="size-12 shrink-0 text-navy-800" strokeWidth={1.4} />
            <div className="flex-1">
              <p className="font-bold">Не знайшли потрібний товар?</p>
              <p className="mt-1 text-sm text-muted">Ми допоможемо підібрати необхідні продукти під ваш запит.</p>
            </div>
            <Link
              href="/contacts"
              className="inline-flex h-11 items-center rounded-xl border border-brand-600 bg-white px-6 text-sm font-semibold text-brand-600 transition hover:bg-brand-600 hover:text-white"
            >
              Зв&apos;язатися з нами
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold">{title}</h2>
      {children}
    </div>
  );
}

function CategoryLink({ href, active, label, count }: { href: string; active: boolean; label: string; count?: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
        active ? "bg-brand-600 font-semibold text-white" : "text-ink/80 hover:bg-canvas"
      }`}
    >
      {label}
      {count !== undefined && <span className={`text-xs ${active ? "text-white/80" : "text-muted"}`}>{count}</span>}
    </Link>
  );
}

function CheckLink({ href, checked, label }: { href: string; checked: boolean; label: string }) {
  return (
    <Link href={href} role="checkbox" aria-checked={checked} className="group flex items-center gap-2.5 py-1 text-sm">
      <span
        className={`grid size-4.5 place-items-center rounded border transition ${
          checked ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white group-hover:border-brand-500"
        }`}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      {label}
    </Link>
  );
}

function ViewLink({ href, active, label, children }: { href: string; active: boolean; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-pressed={active}
      className={`grid size-9 place-items-center transition ${active ? "bg-brand-50 text-brand-600" : "text-muted hover:text-ink"}`}
    >
      {children}
    </Link>
  );
}

function Pagination({ state, pages }: { state: CatalogState; pages: number }) {
  const btn = "grid size-9 place-items-center rounded-lg border text-sm font-semibold transition";
  return (
    <nav aria-label="Сторінки" className="mt-8 flex items-center justify-center gap-1.5">
      {state.page > 1 && (
        <Link href={catalogHref(state, { page: state.page - 1 })} className={`${btn} border-line bg-white`} aria-label="Попередня сторінка">
          <ChevronLeft className="size-4" />
        </Link>
      )}
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <Link
          key={n}
          href={catalogHref(state, { page: n })}
          aria-current={n === state.page ? "page" : undefined}
          className={`${btn} ${n === state.page ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white hover:border-brand-200"}`}
        >
          {n}
        </Link>
      ))}
      {state.page < pages && (
        <Link href={catalogHref(state, { page: state.page + 1 })} className={`${btn} border-line bg-white`} aria-label="Наступна сторінка">
          <ChevronRight className="size-4" />
        </Link>
      )}
    </nav>
  );
}

function PromoCard() {
  return (
    <div className="hidden overflow-hidden rounded-2xl bg-gradient-to-b from-brand-50 to-white p-5 lg:block">
      <p className="text-lg font-bold leading-snug text-navy-800">Якісні європейські продукти для вашого бізнесу</p>
      <div className="relative mt-3 h-36">
        <Image src="/demo/products/olyvky-helcom-zeleni-bez-kistochky-340-h.svg" alt="" fill unoptimized className="object-contain object-left" />
        <Image src="/demo/products/kava-vivavo-caffe-crema-1-kh.svg" alt="" fill unoptimized className="object-contain object-right" />
      </div>
      <p className="mt-2 -rotate-3 font-script text-2xl text-brand-600">Смак, якому довіряють</p>
    </div>
  );
}
