import { CircleAlert, CircleCheck, Loader } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import type { ImportStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Адмінпанель", robots: { index: false } };

const fmt = new Intl.DateTimeFormat("uk-UA", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Kyiv" });

type ImportErrorRow = { item: string; message: string };

export default async function AdminPage() {
  await connection();
  const [runs, counts] = await Promise.all([
    db.importRun.findMany({ orderBy: { startedAt: "desc" }, take: 15 }),
    Promise.all([
      db.product.count({ where: { isActive: true } }),
      db.product.count({ where: { isActive: false } }),
      db.product.count({ where: { isActive: true, images: { none: {} } } }),
      db.order.count({ where: { status: "NEW" } }),
    ]),
  ]);
  const [active, hidden, noPhoto, newOrders] = counts;
  const [lastSync, lastSyncOk, lastCleanup] = await Promise.all([
    db.importRun.findFirst({ where: { kind: "SYNC" }, orderBy: { startedAt: "desc" } }),
    db.importRun.findFirst({ where: { kind: "SYNC", status: "SUCCESS" }, orderBy: { startedAt: "desc" } }),
    db.importRun.findFirst({ where: { kind: "CLEANUP" }, orderBy: { startedAt: "desc" } }),
  ]);

  return (
    <div className="space-y-8">

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Товарів на сайті" value={active} />
        <Stat label="Приховано (немає у 1С)" value={hidden} />
        <Stat label="Без фото" value={noPhoto} warn={noPhoto > 0} />
        <Stat label="Нові замовлення" value={newOrders} warn={newOrders > 0} />
      </div>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold">Імпорт з 1С</h2>
        {lastSync ? (
          <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
            <div className="space-y-1.5 rounded-xl bg-canvas p-4">
              <p className="flex items-center gap-2 font-semibold">
                Синхронізація <StatusBadge status={lastSync.status} />
              </p>
              <p>
                Останній запуск: <b>{fmt.format(lastSync.startedAt)}</b>
              </p>
              <p>
                Останній успішний: <b>{lastSyncOk ? fmt.format(lastSyncOk.startedAt) : "—"}</b>
              </p>
              {lastSync.message && <p className="text-muted">{lastSync.message}</p>}
            </div>
            <div className="space-y-1.5 rounded-xl bg-canvas p-4">
              <p className="flex items-center gap-2 font-semibold">
                Прибирання {lastCleanup ? <StatusBadge status={lastCleanup.status} /> : <span className="text-muted">ще не було</span>}
              </p>
              {lastCleanup && (
                <>
                  <p>
                    Останній запуск: <b>{fmt.format(lastCleanup.startedAt)}</b>, приховано: <b>{lastCleanup.deactivated}</b>
                  </p>
                  {lastCleanup.message && <p className="text-muted">{lastCleanup.message}</p>}
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Імпорт ще не запускався. Команда: <code className="rounded bg-canvas px-1.5 py-0.5">npm run import:daily</code>
          </p>
        )}

        {runs.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Початок</th>
                  <th className="py-2 pr-4 font-medium">Задача</th>
                  <th className="py-2 pr-4 font-medium">Статус</th>
                  <th className="py-2 pr-4 font-medium">Джерело</th>
                  <th className="py-2 pr-4 text-right font-medium">У файлі</th>
                  <th className="py-2 pr-4 text-right font-medium">Нових</th>
                  <th className="py-2 pr-4 text-right font-medium">Оновлено</th>
                  <th className="py-2 pr-4 text-right font-medium">Відновлено</th>
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
                      <td className="whitespace-nowrap py-2.5 pr-4">
                        {r.kind === "SYNC" ? "Синхронізація" : "Прибирання"}
                        {r.kind === "SYNC" && r.status === "SUCCESS" && (
                          <span className="block text-xs text-muted">{r.fullExport ? "повний каталог" : "лише зміни"}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="max-w-56 truncate py-2.5 pr-4" title={r.source}>
                        {r.source}
                      </td>
                      <td className="py-2.5 pr-4 text-right">{r.kind === "SYNC" ? r.total : "—"}</td>
                      <td className="py-2.5 pr-4 text-right">{r.kind === "SYNC" ? r.created : "—"}</td>
                      <td className="py-2.5 pr-4 text-right">{r.kind === "SYNC" ? r.updated : "—"}</td>
                      <td className="py-2.5 pr-4 text-right">{r.kind === "SYNC" ? r.restored : "—"}</td>
                      <td className="py-2.5 pr-4 text-right">{r.kind === "CLEANUP" ? r.deactivated : "—"}</td>
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
