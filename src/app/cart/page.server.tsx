import { ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CartLines } from "@/components/cart/CartLines";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { RequestCartPage } from "@/components/cart/RequestCartPage";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { requireClient } from "@/lib/auth/session";
import { B2B_ENABLED } from "@/lib/features";
import { getCart } from "@/lib/cart";
import { db } from "@/lib/db";
import { formatPrice, plural } from "@/lib/format";

export const metadata: Metadata = { title: "Кошик", robots: { index: false } };

export default async function CartPage() {
  if (!B2B_ENABLED) return <RequestCartPage />; // каталог без цін: кошик-заявка в браузері
  const viewer = await requireClient("/cart");
  const [cart, user] = await Promise.all([getCart(viewer.id), db.user.findUniqueOrThrow({ where: { id: viewer.id } })]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Головна", href: "/" }, { label: "Кошик" }]} />
      <h1 className="mb-6 mt-2 text-2xl font-bold sm:text-3xl">Кошик</h1>

      {cart.lines.length === 0 ? (
        <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <ShoppingCart className="mx-auto size-10 text-brand-200" />
          <h2 className="mt-4 text-lg font-bold">Кошик порожній</h2>
          <p className="mt-1 text-sm text-muted">Додайте товари з каталогу — ціни й кількість у ящику видно на картках.</p>
          <Link href="/catalog" className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white">
            До каталогу
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section aria-label="Товари в кошику" className="h-fit rounded-2xl bg-white ring-1 ring-line">
            <CartLines lines={cart.lines} />
            <p className="border-t border-line px-4 py-3 text-right text-sm">
              {cart.orderableCount} {plural(cart.orderableCount, ["позиція", "позиції", "позицій"])} на суму{" "}
              <span className="font-bold">{formatPrice(cart.total)}</span>
            </p>
          </section>
          <section className="h-fit rounded-2xl bg-white p-6 ring-1 ring-line">
            <h2 className="mb-5 text-lg font-bold">Оформлення замовлення</h2>
            {cart.orderableCount > 0 ? (
              <CheckoutForm total={cart.total} defaults={{ recipientName: user.contactName, recipientPhone: user.phone, city: user.city ?? "" }} />
            ) : (
              <p className="text-sm text-muted">У кошику немає товарів, доступних для замовлення.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
