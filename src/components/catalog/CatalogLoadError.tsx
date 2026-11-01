"use client";

// Не вдалося завантажити /data/products.json (useCatalogData) — каталог і сторінка товару
export function CatalogLoadError({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">Перевірте з&apos;єднання з інтернетом і оновіть сторінку.</p>
      <button
        type="button"
        onClick={() => location.reload()}
        className="mt-8 inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white"
      >
        Оновити
      </button>
    </div>
  );
}
