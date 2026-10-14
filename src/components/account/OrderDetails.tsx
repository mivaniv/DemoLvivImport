import Link from "next/link";
import { formatDateTime, formatPrice, orderNumber } from "@/lib/format";
import { DELIVERY_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/orders";
import type { DeliveryMethod, OrderStatus } from "@/generated/prisma/enums";

// Склад замовлення — спільний для кабінету клієнта й адмінпанелі.
type Order = {
  id: number;
  status: OrderStatus;
  createdAt: Date;
  deliveryMethod: DeliveryMethod;
  deliveryCity: string | null;
  deliveryPoint: string | null;
  recipientName: string;
  recipientPhone: string;
  comment: string | null;
  total: unknown;
  items: { id: number; name: string; sku: string | null; quantity: number; price: unknown; sum: unknown; product: { slug: string } | null }[];
};

export function OrderDetails({ order, children }: { order: Order; children?: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Замовлення {orderNumber(order.id)}</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ORDER_STATUS_STYLES[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
        <span className="text-sm text-muted">від {formatDateTime(order.createdAt)}</span>
      </div>

      {children}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 text-sm ring-1 ring-line">
          <p className="font-semibold">Доставка</p>
          <p className="mt-1">{DELIVERY_LABELS[order.deliveryMethod]}</p>
          {(order.deliveryCity || order.deliveryPoint) && (
            <p className="text-muted">{[order.deliveryCity, order.deliveryPoint].filter(Boolean).join(", ")}</p>
          )}
        </div>
        <div className="rounded-2xl bg-white p-5 text-sm ring-1 ring-line">
          <p className="font-semibold">Отримувач</p>
          <p className="mt-1">
            {order.recipientName}, {order.recipientPhone}
          </p>
          {order.comment && <p className="mt-1 italic text-muted">{order.comment}</p>}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Товар</th>
              <th className="px-3 py-3 text-right font-medium">Кількість</th>
              <th className="px-3 py-3 text-right font-medium">Ціна</th>
              <th className="px-5 py-3 text-right font-medium">Сума</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {order.items.map((i) => (
              <tr key={i.id}>
                <td className="px-5 py-3">
                  {i.product ? (
                    <Link href={`/product/${i.product.slug}`} className="font-medium hover:text-brand-600">
                      {i.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{i.name}</span>
                  )}
                  {i.sku && <span className="block text-xs text-muted">Артикул: {i.sku}</span>}
                </td>
                <td className="px-3 py-3 text-right">{i.quantity} шт.</td>
                <td className="px-3 py-3 text-right">{formatPrice(Number(i.price))}</td>
                <td className="px-5 py-3 text-right font-semibold">{formatPrice(Number(i.sum))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line">
              <td colSpan={3} className="px-5 py-4 text-right font-semibold">
                Разом:
              </td>
              <td className="px-5 py-4 text-right text-lg font-extrabold">{formatPrice(Number(order.total))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
