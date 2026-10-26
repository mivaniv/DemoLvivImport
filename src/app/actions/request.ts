"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { MANAGER_EMAIL, sendMail, siteUrl } from "@/lib/mail";
import { DELIVERY_LABELS } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { parseRequestItems, requestLines, type RequestItem } from "@/lib/request-cart";
import { deliveryShape, refineDelivery } from "./delivery";
import { fieldErrorsOf, PHONE_RE, valuesOf, type FormState } from "./form-state";

// Кошик-заявка (каталог без цін): товари приходять з браузера, менеджер отримує заявку листом і в /admin/inquiries.

const schema = z
  .object({
    ...deliveryShape,
    name: z.string().trim().min(2, "Вкажіть отримувача").max(120),
    phone: z.string().trim().regex(PHONE_RE, "Вкажіть телефон, наприклад +380 67 123 45 67"),
    company: z.string().trim().max(200).optional(),
    email: z.union([z.literal(""), z.email("Некоректний email")]).optional(),
    comment: z.string().trim().max(2000).optional(),
  })
  .superRefine(refineDelivery);

const FIELDS = ["deliveryMethod", "deliveryCity", "deliveryPoint", "name", "phone", "company", "email", "comment"] as const;

export async function submitRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = valuesOf(formData, FIELDS);
  if (formData.get("website")) return { ok: true, message: "Дякуємо! Менеджер зв'яжеться з вами." };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`request:${ip}`, 5, 10 * 60_000)) {
    return { ok: false, message: "Забагато заявок. Спробуйте за кілька хвилин або зателефонуйте нам.", values };
  }
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error.issues), values };

  let raw: unknown = null;
  try {
    raw = JSON.parse(String(formData.get("items") ?? ""));
  } catch {
    // нижче — «кошик порожній»
  }
  const items = await withCatalogData(parseRequestItems(raw));
  if (items.length === 0) return { ok: false, message: "Кошик порожній — додайте товари з каталогу.", values };

  const d = parsed.data;
  const delivery = [DELIVERY_LABELS[d.deliveryMethod], d.deliveryMethod !== "PICKUP" && `${d.deliveryCity}, ${d.deliveryPoint}`].filter(Boolean).join(" — ");
  const lines = requestLines(items);
  const message = [...lines, "", `Доставка: ${delivery}`, d.comment ? `Коментар: ${d.comment}` : null].filter((l) => l !== null).join("\n");

  await db.inquiry.create({
    data: { kind: "REQUEST", name: d.name, phone: d.phone, email: d.email || null, organization: d.company || null, message, page: "/cart" },
  });
  await sendMail({
    to: MANAGER_EMAIL,
    replyTo: d.email || undefined,
    subject: `Заявка з кошика: ${d.company || d.name}, ${items.length} поз.`,
    text: [
      `Отримувач: ${d.name}`,
      `Телефон: ${d.phone}`,
      d.company ? `Компанія: ${d.company}` : null,
      d.email ? `Email: ${d.email}` : null,
      "",
      message,
      "",
      `Усі звернення: ${siteUrl("/admin/inquiries")}`,
    ]
      .filter((l) => l !== null)
      .join("\n"),
  });
  return { ok: true, message: "Дякуємо! Менеджер зв'яжеться з вами, щоб підтвердити ціни, наявність і доставку." };
}

// Назва, артикул і фасування — з бази, а не з браузера; товари, яких уже немає, відкидаються
async function withCatalogData(items: RequestItem[]): Promise<RequestItem[]> {
  if (items.length === 0) return [];
  const rows = await db.product.findMany({
    where: { slug: { in: items.map((i) => i.slug) }, isActive: true },
    select: { slug: true, sku: true, name: true, unit: true, unitsPerBox: true, minOrder: true },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return items.flatMap((i) => {
    const p = bySlug.get(i.slug);
    return p ? parseRequestItems([{ ...i, ...p }]) : [];
  });
}
