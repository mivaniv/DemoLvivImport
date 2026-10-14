"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { orderNumber } from "@/lib/format";
import { sendMail, siteUrl } from "@/lib/mail";
import { ORDER_STATUS_LABELS } from "@/lib/orders";

// Дії адмінпанелі. Кожна перевіряє роль: серверна дія — це публічна точка входу, її можна викликати напряму.

const id = (formData: FormData, key = "id") => z.coerce.number().int().positive().parse(formData.get(key));

export async function setUserStatus(formData: FormData) {
  const admin = await requireAdmin();
  const userId = id(formData);
  const status = z.enum(["ACTIVE", "BLOCKED", "PENDING"]).parse(formData.get("status"));
  if (userId === admin.id) return; // не блокуємо самих себе

  const before = await db.user.findUniqueOrThrow({ where: { id: userId } });
  await db.user.update({
    where: { id: userId },
    data: { status, ...(status === "ACTIVE" && !before.approvedAt && { approvedAt: new Date() }) },
  });
  // Заблокований виходить з усіх пристроїв одразу
  if (status === "BLOCKED") await db.session.deleteMany({ where: { userId } });

  if (status === "ACTIVE" && before.status !== "ACTIVE") {
    await sendMail({
      to: before.email,
      subject: "Доступ до кабінету відкрито — Львівімпорт",
      text: `Вітаємо, ${before.contactName}!\n\nАкаунт «${before.company}» підтверджено: вам доступні оптові ціни, кошик і замовлення.\n\nУвійти: ${siteUrl("/account/login")}`,
    });
  }
  revalidatePath("/admin", "layout");
}

export async function saveManagerNote(formData: FormData) {
  await requireAdmin();
  const note = String(formData.get("managerNote") ?? "").trim().slice(0, 2000);
  await db.user.update({ where: { id: id(formData) }, data: { managerNote: note || null } });
  revalidatePath("/admin/users");
}

export async function setOrderStatus(formData: FormData) {
  await requireAdmin();
  const orderId = id(formData);
  const status = z.enum(["NEW", "CONFIRMED", "SHIPPED", "DONE", "CANCELLED"]).parse(formData.get("status"));
  const order = await db.order.update({ where: { id: orderId }, data: { status }, include: { user: true } });
  await sendMail({
    to: order.user.email,
    subject: `Замовлення ${orderNumber(order.id)}: ${ORDER_STATUS_LABELS[status].toLowerCase()}`,
    text: `Статус вашого замовлення ${orderNumber(order.id)} змінено на «${ORDER_STATUS_LABELS[status]}».\n\n${siteUrl(`/account/orders/${order.id}`)}`,
  });
  revalidatePath("/admin", "layout");
}

export async function setInquiryStatus(formData: FormData) {
  await requireAdmin();
  const status = z.enum(["NEW", "DONE"]).parse(formData.get("status"));
  await db.inquiry.update({ where: { id: id(formData) }, data: { status } });
  revalidatePath("/admin", "layout");
}

export async function moderateReview(formData: FormData) {
  await requireAdmin();
  const reviewId = id(formData);
  const status = z.enum(["PUBLISHED", "REJECTED", "PENDING"]).parse(formData.get("status"));
  const reply = String(formData.get("reply") ?? "").trim().slice(0, 2000);
  await db.review.update({
    where: { id: reviewId },
    data: { status, reply: reply || null, ...(status === "PUBLISHED" && { publishedAt: new Date() }) },
  });
  revalidatePath("/admin", "layout");
  revalidatePath("/reviews");
}

export async function toggleProductFlag(formData: FormData) {
  await requireAdmin();
  const flag = z.enum(["isPopular", "isNew", "isSale"]).parse(formData.get("flag"));
  const value = formData.get("value") === "1";
  await db.product.update({ where: { id: id(formData) }, data: { [flag]: value } });
  revalidatePath("/admin/products");
}
