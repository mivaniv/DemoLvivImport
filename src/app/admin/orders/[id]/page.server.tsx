import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setOrderStatus } from "@/app/actions/admin";
import { OrderDetails } from "@/components/account/OrderDetails";
import { ActionButton, Card } from "@/components/admin/ui";
import type { OrderStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import type { IdPageProps } from "@/lib/page-props";

export const metadata: Metadata = { title: "Замовлення — адмінпанель", robots: { index: false } };

export default async function AdminOrderPage(props: IdPageProps) {
  const { id } = await props.params;
  const order = await db.order.findUnique({
    where: { id: Number(id) || 0 },
    include: { user: true, items: { orderBy: { id: "asc" }, include: { product: { select: { slug: true } } } } },
  });
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm font-medium text-brand-600 hover:underline">
        ← Усі замовлення
      </Link>
      <OrderDetails order={order}>
        <Card title="Клієнт">
          <div className="flex flex-wrap items-start justify-between gap-4 text-sm">
            <div>
              <p className="font-semibold">
                {order.user.company} (ЄДРПОУ/ІПН {order.user.edrpou ?? "—"})
              </p>
              <p>
                {order.user.contactName} · <a href={`tel:${order.user.phone}`} className="text-brand-600">{order.user.phone}</a> ·{" "}
                <a href={`mailto:${order.user.email}`} className="text-brand-600">{order.user.email}</a>
              </p>
              {order.user.managerNote && <p className="mt-1 text-xs italic text-muted">Примітка: {order.user.managerNote}</p>}
            </div>
            <form action={setOrderStatus} className="flex items-center gap-2">
              <input type="hidden" name="id" value={order.id} />
              <select name="status" defaultValue={order.status} className="h-8 rounded-lg border border-line px-2 text-xs">
                {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <ActionButton>Змінити статус</ActionButton>
            </form>
          </div>
          <p className="mt-3 text-xs text-muted">Клієнт отримає лист про зміну статусу.</p>
        </Card>
      </OrderDetails>
    </div>
  );
}
