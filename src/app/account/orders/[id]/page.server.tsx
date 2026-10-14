import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetails } from "@/components/account/OrderDetails";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { requireViewer } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { IdPageProps } from "@/lib/page-props";

export const metadata: Metadata = { title: "Замовлення", robots: { index: false } };

export default async function OrderPage(props: IdPageProps) {
  const { id } = await props.params;
  const viewer = await requireViewer(`/account/orders/${id}`);
  const { placed } = await props.searchParams;

  // Клієнт бачить лише власні замовлення
  const order = await db.order.findFirst({
    where: { id: Number(id) || 0, userId: viewer.id },
    include: { items: { orderBy: { id: "asc" }, include: { product: { select: { slug: true } } } } },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Головна", href: "/" }, { label: "Особистий кабінет", href: "/account" }, { label: "Замовлення" }]} />
      <div className="mt-4">
        <OrderDetails order={order}>
          {placed && (
            <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CircleCheck className="mt-0.5 size-4 shrink-0" />
              Дякуємо! Замовлення прийнято. Менеджер підтвердить його найближчим часом — копію ми надіслали на ваш email.
            </p>
          )}
        </OrderDetails>
      </div>
    </div>
  );
}
