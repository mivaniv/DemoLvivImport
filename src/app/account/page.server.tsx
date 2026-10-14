import { CircleCheck, Clock, FileSpreadsheet, LogOut, ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { PasswordForm, ProfileForm } from "@/components/account/AuthForms";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { MAIN_PHONE } from "@/content/company";
import { requireViewer } from "@/lib/auth/session";
import { B2B_ENABLED } from "@/lib/features";
import { db } from "@/lib/db";
import { formatDateTime, formatPrice, orderNumber } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/orders";
import type { SearchPageProps } from "@/lib/page-props";

export const metadata: Metadata = { title: "Особистий кабінет", robots: { index: false } };

export default async function AccountPage(props: SearchPageProps) {
  const viewer = await requireViewer();
  const params = await props.searchParams;
  const [user, orders] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: viewer.id } }),
    db.order.findMany({
      where: { userId: viewer.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { _count: { select: { items: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Головна", href: "/" }, { label: "Особистий кабінет" }]} />
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold sm:text-3xl">{user.company}</h1>
          <p className="text-sm text-muted">
            {user.contactName} · {user.email}
          </p>
        </div>
        {B2B_ENABLED && viewer.canOrder && (
          <>
            <Link href="/cart" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">
              <ShoppingCart className="size-4" /> Кошик
            </Link>
            <a href="/price-list" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-semibold hover:border-brand-200">
              <FileSpreadsheet className="size-4" /> Завантажити прайс
            </a>
          </>
        )}
        <form action={logout}>
          <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-semibold text-muted hover:text-ink">
            <LogOut className="size-4" /> Вийти
          </button>
        </form>
      </div>

      {params.password === "changed" && <Notice ok>Пароль змінено.</Notice>}
      {user.status === "PENDING" ? (
        <Notice>
          <span>
            {params.registered ? "Дякуємо за заявку! " : ""}Ваш акаунт очікує підтвердження менеджером. Після перевірки відкриються ціни й
            замовлення — ми повідомимо листом. Пришвидшити можна за телефоном{" "}
            <a href={MAIN_PHONE.href} className="font-semibold underline">
              {MAIN_PHONE.label}
            </a>
            .
          </span>
        </Notice>
      ) : (
        <Notice ok>Акаунт підтверджено: вам доступні оптові ціни та замовлення.</Notice>
      )}

      <section className="rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
        <h2 className="text-lg font-bold">Мої замовлення</h2>
        {orders.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Замовлень ще немає.{" "}
            {viewer.canOrder && (
              <Link href="/catalog" className="font-medium text-brand-600 hover:underline">
                Перейти до каталогу
              </Link>
            )}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th className="py-2 pr-4 font-medium">Номер</th>
                  <th className="py-2 pr-4 font-medium">Дата</th>
                  <th className="py-2 pr-4 font-medium">Статус</th>
                  <th className="py-2 pr-4 text-right font-medium">Позицій</th>
                  <th className="py-2 text-right font-medium">Сума</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 pr-4">
                      <Link href={`/account/orders/${o.id}`} className="font-semibold text-brand-600 hover:underline">
                        {orderNumber(o.id)}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{formatDateTime(o.createdAt)}</td>
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
      </section>

      <section className="rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
        <h2 className="mb-5 text-lg font-bold">Дані компанії</h2>
        <ProfileForm
          initial={{ company: user.company, edrpou: user.edrpou ?? "", contactName: user.contactName, phone: user.phone, city: user.city ?? "" }}
        />
      </section>

      <section className="rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
        <h2 className="mb-5 text-lg font-bold">Зміна пароля</h2>
        <PasswordForm />
      </section>
    </div>
  );
}

function Notice({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <p className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
      {ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <Clock className="mt-0.5 size-4 shrink-0" />}
      {children}
    </p>
  );
}
