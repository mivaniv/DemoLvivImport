import type { Metadata } from "next";
import Link from "next/link";
import { toggleProductFlag } from "@/app/actions/admin";
import { Card } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import type { SearchPageProps } from "@/lib/page-props";

export const metadata: Metadata = { title: "Товари — адмінпанель", robots: { index: false } };

// Позначки «Популярні» / «Новинки» / «Акції» (Top / New / Sale) — ставить менеджер,
// якщо вони не приходять з 1С. Імпорт змінює позначку лише тоді, коли вона є у файлі.
const FLAGS = [
  { key: "isPopular", label: "Top" },
  { key: "isNew", label: "New" },
  { key: "isSale", label: "Sale" },
] as const;

export default async function AdminProductsPage(props: SearchPageProps) {
  const { q: raw } = await props.searchParams;
  const q = typeof raw === "string" ? raw.trim() : "";
  const products = await db.product.findMany({
    where: {
      isActive: true,
      ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }, { barcode: { contains: q } }] }),
    },
    orderBy: { sortOrder: "asc" },
    take: 100,
    select: { id: true, slug: true, name: true, sku: true, price: true, isPopular: true, isNew: true, isSale: true },
  });

  return (
    <Card
      title="Товари: позначки Top / New / Sale"
      actions={
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Назва, артикул, штрихкод" className="h-9 w-64 rounded-lg border border-line px-3 text-sm" />
          <button className="h-9 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white">Знайти</button>
        </form>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="py-2 pr-4 font-medium">Товар</th>
              <th className="py-2 pr-4 font-medium">Артикул</th>
              <th className="py-2 pr-4 text-right font-medium">Ціна</th>
              {FLAGS.map((f) => (
                <th key={f.key} className="py-2 pr-2 text-center font-medium">{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="py-2.5 pr-4">
                  <Link href={`/product/${p.slug}`} className="hover:text-brand-600">{p.name}</Link>
                </td>
                <td className="py-2.5 pr-4 text-muted">{p.sku ?? "—"}</td>
                <td className="py-2.5 pr-4 text-right">{p.price === null ? "—" : formatPrice(Number(p.price))}</td>
                {FLAGS.map((f) => (
                  <td key={f.key} className="py-2.5 pr-2 text-center">
                    <form action={toggleProductFlag}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="flag" value={f.key} />
                      <input type="hidden" name="value" value={p[f.key] ? "0" : "1"} />
                      <button
                        aria-label={`${f.label}: ${p[f.key] ? "зняти" : "поставити"}`}
                        className={`h-7 w-12 rounded-full text-[11px] font-bold transition ${p[f.key] ? "bg-brand-600 text-white" : "bg-canvas text-muted hover:bg-brand-50"}`}
                      >
                        {p[f.key] ? "так" : "—"}
                      </button>
                    </form>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {products.length === 100 && <p className="mt-3 text-xs text-muted">Показано перші 100 — уточніть пошук.</p>}
    </Card>
  );
}
