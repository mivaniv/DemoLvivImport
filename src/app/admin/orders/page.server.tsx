import type { Metadata } from "next";
import Link from "next/link";
import { Card, FilterTabs } from "@/components/admin/ui";
import type { OrderStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDateTime, formatPrice, orderNumber } from "@/lib/format";
import { DELIVERY_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/orders";
import type { SearchPageProps } from "@/lib/page-props";

export const metadata: Metadata = { title: "Замовлення — адмінпанель", robots: { index: false } };

export default async function AdminOrdersPage(props: SearchPageProps) {
  const { status: raw } = await props.searchParams;
  const status = (Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).find((s) => s === raw);
  const orders = await db.order.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { company: true, phone: true } }, _count: { select: { items: true } } },
  });

  return (
    <Card
      title="Замовлення"
      actions={
        <FilterTabs
          current={status ?? "ALL"}
          options={[
            { value: "ALL", label: "Усі", href: "/admin/orders" },
            ...(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s], href: `/admin/orders?status=${s}` })),
          ]}
        />
      }
    >
      {orders.length === 0 ? (
        <p className="text-sm text-muted">Замовлень немає.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="py-2 pr-4 font-medium">Номер</th>
                <th className="py-2 pr-4 font-medium">Дата</th>
                <th className="py-2 pr-4 font-medium">Клієнт</th>
                <th className="py-2 pr-4 font-medium">Доставка</th>
                <th className="py-2 pr-4 font-medium">Статус</th>
                <th className="py-2 pr-4 text-right font-medium">Позицій</th>
                <th className="py-2 text-right font-medium">Сума</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="py-3 pr-4">
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand-600 hover:underline">
                      {orderNumber(o.id)}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">{formatDateTime(o.createdAt)}</td>
                  <td className="py-3 pr-4">
                    {o.user.company}
                    <span className="block text-xs text-muted">{o.user.phone}</span>
                  </td>
                  <td className="py-3 pr-4 text-xs">{DELIVERY_LABELS[o.deliveryMethod]}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_STYLES[o.status]}`}>{ORDER_STATUS_LABELS[o.status]}</span>
                  </td>
                  <td className="py-3 pr-4 text-right">{o._count.items}</td>
                  <td className="py-3 text-right font-semibold">{formatPrice(Number(o.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
