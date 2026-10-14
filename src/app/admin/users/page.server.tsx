import type { Metadata } from "next";
import { saveManagerNote, setUserStatus } from "@/app/actions/admin";
import { ActionButton, Card, FilterTabs, Pill } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import type { SearchPageProps } from "@/lib/page-props";

export const metadata: Metadata = { title: "Клієнти — адмінпанель", robots: { index: false } };

const STATUS = {
  PENDING: { label: "Очікує підтвердження", tone: "amber" },
  ACTIVE: { label: "Активний", tone: "emerald" },
  BLOCKED: { label: "Заблокований", tone: "red" },
} as const;

export default async function AdminUsersPage(props: SearchPageProps) {
  const { status: raw } = await props.searchParams;
  const status = raw === "ACTIVE" || raw === "BLOCKED" || raw === "ALL" ? raw : "PENDING";
  const users = await db.user.findMany({
    where: status === "ALL" ? {} : { status },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { orders: true } } },
  });

  return (
    <Card
      title="Клієнти"
      actions={
        <FilterTabs
          current={status}
          options={[
            { value: "PENDING", label: "Заявки", href: "/admin/users" },
            { value: "ACTIVE", label: "Активні", href: "/admin/users?status=ACTIVE" },
            { value: "BLOCKED", label: "Заблоковані", href: "/admin/users?status=BLOCKED" },
            { value: "ALL", label: "Усі", href: "/admin/users?status=ALL" },
          ]}
        />
      }
    >
      {users.length === 0 ? (
        <p className="text-sm text-muted">Немає записів.</p>
      ) : (
        <ul className="divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className="grid gap-4 py-4 lg:grid-cols-[1.3fr_1fr_1.2fr]">
              <div className="space-y-1 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {u.company} <Pill tone={STATUS[u.status].tone}>{STATUS[u.status].label}</Pill>
                  {u.role === "ADMIN" && <Pill tone="brand">адміністратор</Pill>}
                </p>
                <p className="text-muted">
                  ЄДРПОУ/ІПН: {u.edrpou ?? "—"} · {u.city ?? "місто не вказано"}
                </p>
                <p>
                  {u.contactName} ·{" "}
                  <a href={`tel:${u.phone}`} className="text-brand-600">{u.phone}</a> ·{" "}
                  <a href={`mailto:${u.email}`} className="text-brand-600">{u.email}</a>
                </p>
                <p className="text-xs text-muted">
                  Заявка: {formatDateTime(u.createdAt)}
                  {u.lastLoginAt && <> · останній вхід {formatDateTime(u.lastLoginAt)}</>} · замовлень: {u._count.orders}
                </p>
              </div>
              <form action={saveManagerNote} className="flex flex-col gap-2">
                <input type="hidden" name="id" value={u.id} />
                <textarea name="managerNote" defaultValue={u.managerNote ?? ""} rows={2} placeholder="Примітка менеджера (бачите лише ви)" className="rounded-lg border border-line px-3 py-2 text-xs" />
                <div>
                  <ActionButton tone="ghost">Зберегти примітку</ActionButton>
                </div>
              </form>
              <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                {u.status !== "ACTIVE" && (
                  <StatusForm id={u.id} status="ACTIVE">
                    <ActionButton>Підтвердити доступ</ActionButton>
                  </StatusForm>
                )}
                {u.status !== "BLOCKED" && u.role !== "ADMIN" && (
                  <StatusForm id={u.id} status="BLOCKED">
                    <ActionButton tone="danger">Заблокувати</ActionButton>
                  </StatusForm>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function StatusForm({ id, status, children }: { id: number; status: string; children: React.ReactNode }) {
  return (
    <form action={setUserStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      {children}
    </form>
  );
}
