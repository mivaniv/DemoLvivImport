"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth/session";
import { getCart, MAX_QTY, round2 } from "@/lib/cart";
import { db } from "@/lib/db";
import { B2B_ENABLED } from "@/lib/features";
import { formatPrice, orderNumber } from "@/lib/format";
import { MANAGER_EMAIL, sendMail, siteUrl } from "@/lib/mail";
import { DELIVERY_LABELS } from "@/lib/orders";
import { fieldErrorsOf, PHONE_RE, valuesOf, type FormState } from "./form-state";

export type CartActionResult = { ok: boolean; message?: string };

async function orderingViewer() {
  if (!B2B_ENABLED) return null; // кошик і замовлення відкриються разом із кабінетом
  const viewer = await getViewer();
  return viewer?.canOrder ? viewer : null;
}

export async function addToCart(productId: number, quantity: number): Promise<CartActionResult> {
  const viewer = await orderingViewer();
  if (!viewer) return { ok: false, message: "Увійдіть як клієнт, щоб замовляти" };

  const product = await db.product.findFirst({
    where: { id: productId, isActive: true },
    select: { price: true, minOrder: true },
  });
  if (!product) return { ok: false, message: "Товар більше недоступний" };
  if (product.price === null) return { ok: false, message: "Ціна уточнюється — зверніться до менеджера" };

  const qty = Math.trunc(quantity);
  if (!(qty >= product.minOrder) || qty > MAX_QTY) {
    return { ok: false, message: `Мінімальне замовлення — ${product.minOrder} шт.` };
  }

  const existing = await db.cartItem.findUnique({ where: { userId_productId: { userId: viewer.id, productId } } });
  await db.cartItem.upsert({
    where: { userId_productId: { userId: viewer.id, productId } },
    create: { userId: viewer.id, productId, quantity: qty },
    update: { quantity: Math.min(MAX_QTY, (existing?.quantity ?? 0) + qty) },
  });
  refresh(); // оновлює лічильник кошика в шапці
  return { ok: true };
}

export async function setCartQuantity(productId: number, quantity: number): Promise<CartActionResult> {
  const viewer = await orderingViewer();
  if (!viewer) return { ok: false, message: "Сесія завершилась — увійдіть знову" };
  const product = await db.product.findUnique({ where: { id: productId }, select: { minOrder: true } });
  const qty = Math.min(MAX_QTY, Math.max(product?.minOrder ?? 1, Math.trunc(quantity) || 0));
  await db.cartItem.updateMany({ where: { userId: viewer.id, productId }, data: { quantity: qty } });
  refresh();
  return { ok: true };
}

export async function removeFromCart(productId: number): Promise<CartActionResult> {
  const viewer = await orderingViewer();
  if (!viewer) return { ok: false, message: "Сесія завершилась — увійдіть знову" };
  await db.cartItem.deleteMany({ where: { userId: viewer.id, productId } });
  refresh();
  return { ok: true };
}

const checkoutSchema = z
  .object({
    deliveryMethod: z.enum(["OWN_LOGISTICS", "NOVA_POSHTA", "DELIVERY", "MEEST", "PICKUP"], { error: "Оберіть спосіб доставки" }),
    deliveryCity: z.string().trim().max(120).optional(),
    deliveryPoint: z.string().trim().max(300).optional(),
    recipientName: z.string().trim().min(2, "Вкажіть отримувача").max(120),
    recipientPhone: z.string().trim().regex(PHONE_RE, "Вкажіть телефон отримувача"),
    comment: z.string().trim().max(2000).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.deliveryMethod === "PICKUP") return;
    if (!d.deliveryCity) ctx.addIssue({ code: "custom", path: ["deliveryCity"], message: "Вкажіть населений пункт" });
    if (!d.deliveryPoint) {
      ctx.addIssue({
        code: "custom",
        path: ["deliveryPoint"],
        message: d.deliveryMethod === "OWN_LOGISTICS" ? "Вкажіть адресу доставки" : "Вкажіть номер відділення",
      });
    }
  });

const CHECKOUT_FIELDS = ["deliveryMethod", "deliveryCity", "deliveryPoint", "recipientName", "recipientPhone", "comment"] as const;

export async function placeOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = valuesOf(formData, CHECKOUT_FIELDS);
  const viewer = await orderingViewer();
  if (!viewer) return { ok: false, message: "Оформлення доступне лише підтвердженим клієнтам", values };

  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error.issues), values };

  // Ціни й наявність — з бази на момент оформлення, а не з форми
  const cart = await getCart(viewer.id);
  const lines = cart.lines.filter((l) => l.available);
  if (lines.length === 0) return { ok: false, message: "У кошику немає товарів, доступних для замовлення", values };

  const d = parsed.data;
  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId: viewer.id,
        deliveryMethod: d.deliveryMethod,
        deliveryCity: d.deliveryMethod === "PICKUP" ? null : d.deliveryCity || null,
        deliveryPoint: d.deliveryMethod === "PICKUP" ? null : d.deliveryPoint || null,
        recipientName: d.recipientName,
        recipientPhone: d.recipientPhone,
        comment: d.comment || null,
        total: round2(lines.reduce((s, l) => s + l.sum, 0)),
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            externalId: l.externalId,
            sku: l.sku,
            name: l.name,
            quantity: l.quantity,
            price: l.price!,
            sum: l.sum,
          })),
        },
      },
    });
    // Оформлені позиції прибираємо з кошика; недоступні лишаються з поясненням
    await tx.cartItem.deleteMany({ where: { userId: viewer.id, productId: { in: lines.map((l) => l.productId) } } });
    return created;
  });

  const summary = [
    `Замовлення ${orderNumber(order.id)} від ${viewer.company}`,
    `Доставка: ${DELIVERY_LABELS[d.deliveryMethod]}${d.deliveryCity ? `, ${d.deliveryCity}` : ""}${d.deliveryPoint ? `, ${d.deliveryPoint}` : ""}`,
    `Отримувач: ${d.recipientName}, ${d.recipientPhone}`,
    d.comment ? `Коментар: ${d.comment}` : "",
    "",
    ...lines.map((l, i) => `${i + 1}. ${l.name}${l.sku ? ` (${l.sku})` : ""} — ${l.quantity} ${l.unit} × ${formatPrice(l.price!)} = ${formatPrice(l.sum)}`),
    "",
    `Разом: ${formatPrice(Number(order.total))}`,
  ]
    .filter((l, i, all) => l !== "" || all[i - 1] !== "")
    .join("\n");

  await Promise.all([
    sendMail({ to: MANAGER_EMAIL, replyTo: viewer.email, subject: `Нове замовлення ${orderNumber(order.id)} — ${viewer.company}`, text: `${summary}\n\n${siteUrl(`/admin/orders/${order.id}`)}` }),
    sendMail({ to: viewer.email, subject: `Ваше замовлення ${orderNumber(order.id)} прийнято`, text: `Дякуємо! Менеджер підтвердить замовлення найближчим часом.\n\n${summary}\n\n${siteUrl(`/account/orders/${order.id}`)}` }),
  ]);

  redirect(`/account/orders/${order.id}?placed=1`);
}
