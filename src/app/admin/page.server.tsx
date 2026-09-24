import { CircleAlert, CircleCheck, Loader } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import type { ImportStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Адмінпанель", robots: { index: false } };

const fmt = new Intl.DateTimeFormat("uk-UA", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Kyiv" });

type ImportErrorRow = { item: string; message: string };
type RequestLine = { name: string; sku?: string | null; quantity: number };

export default async function AdminPage() {
  await connection();
  const [runs, counts, requests] = await Promise.all([
    db.importRun.findMany({ orderBy: { startedAt: "desc" }, take: 15 }),
    Promise.all([
      db.product.count({ where: { isActive: true } }),
      db.product.count({ where: { isActive: false } }),
      db.product.count({ where: { isActive: true, images: { none: {} } } }),
      db.priceRequest.count({ where: { status: "NEW" } }),
    ]),
    db.priceRequest.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const [active, hidden, noPhoto, newRequests] = counts;
  const last = runs[0];
  const lastSuccess = runs.find((r) => r.status === "SUCCESS");

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Адмінпанель</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Товарів на сайті" value={active} />
        <Stat label="Приховано (немає у 1С)" value={hidden} />
        <Stat label="Без фото" value={noPhoto} warn={noPhoto > 0} />
        <Stat label="Нові заявки" value={newRequests} warn={newRequests > 0} />
      </div>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold">Імпорт з 1С</h2>
        {last ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
            <StatusBadge status={last.status} />
            <span>
              Останній запуск: <b>{fmt.format(last.startedAt)}</b>
            </span>
            <span>
              Останній успішний: <b>{lastSuccess ? fmt.format(lastSuccess.startedAt) : "—"}</b>
            </span>
            {last.message && <span className="text-muted">{last.message}</span>}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Імпорт ще не запускався. Команда: <code className="rounded bg-canvas px-1.5 py-0.5">npm run import -- шлях/до/файлу.json</code>
          </p>
        )}

        {runs.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Початок</th>
                  <th className="py-2 pr-4 font-medium">Статус</th>
                  <th className="py-2 pr-4 font-medium">Файл</th>
                  <th className="py-2 pr-4 text-right font-medium">У файлі</th>
                  <th className="py-2 pr-4 text-right font-medium">Нових</th>
                  <th className="py-2 pr-4 text-right font-medium">Оновлено</th>
                  <th className="py-2 pr-4 text-right font-medium">Приховано</th>
                  <th className="py-2 font-medium">Помилки</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {runs.map((r) => {
                  const errors = (r.errors as ImportErrorRow[] | null) ?? [];
                  return (
                    <tr key={r.id} className="align-top">
                      <td className="py-2.5 pr-4 text-muted">{r.id}</td>
                      <td className="whitespace-nowrap py-2.5 pr-4">{fmt.format(r.startedAt)}</td>
                      <td className="py-2.5 pr-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-2.5 pr-4">{r.source}</td>
                      <td className="py-2.5 pr-4 text-right">{r.total}</td>
                      <td className="py-2.5 pr-4 text-right">{r.created}</td>
                      <td className="py-2.5 pr-4 text-right">{r.updated}</td>
                      <td className="py-2.5 pr-4 text-right">{r.deactivated}</td>
                      <td className="py-2.5">
                        {r.message && <p className="mb-1 text-xs text-muted">{r.message}</p>}
                        {errors.length > 0 && (
                          <details>
                            <summary className="cursor-pointer text-xs font-semibold text-amber-700">{r.errorCount} шт.</summary>
                            <ul className="mt-2 max-w-md space-y-1 text-xs">
                              {errors.slice(0, 50).map((e, i) => (
                                <li key={i}>
                                  <b>{e.item}</b>: {e.message}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold">Останні заявки</h2>
        {requests.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Заявок поки немає.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {requests.map((r) => (
              <li key={r.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[180px_1fr_1.4fr]">
                <div>
                  <p className="font-semibold">№{r.id}</p>
                  <p className="text-xs text-muted">{fmt.format(r.createdAt)}</p>
                </div>
                <div>
                  <p className="font-medium">{r.company}</p>
                  <p className="text-xs text-muted">
                    {r.contactName} · <a href={`tel:${r.phone}`} className="hover:text-brand-600">{r.phone}</a>
                    {r.email && <> · <a href={`mailto:${r.email}`} className="hover:text-brand-600">{r.email}</a></>}
                  </p>
                  {r.comment && <p className="mt-1 text-xs italic text-muted">{r.comment}</p>}
                </div>
                <ul className="text-xs">
                  {(r.items as RequestLine[]).map((l, i) => (
                    <li key={i}>
                      {l.name} {l.sku && <span className="text-muted">({l.sku})</span>} — <b>{l.quantity} шт.</b>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${warn ? "text-amber-600" : ""}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ImportStatus }) {
  const map = {
    SUCCESS: { cls: "bg-emerald-50 text-emerald-700", icon: CircleCheck, label: "Успішно" },
    FAILED: { cls: "bg-red-50 text-red-700", icon: CircleAlert, label: "Помилка" },
    RUNNING: { cls: "bg-brand-50 text-brand-700", icon: Loader, label: "Виконується" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${map.cls}`}>
      <map.icon className="size-3.5" />
      {map.label}
    </span>
  );
}
