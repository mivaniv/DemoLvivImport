"use server";

import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  company: z.string().trim().min(2, "Вкажіть назву компанії").max(200),
  contactName: z.string().trim().min(2, "Вкажіть контактну особу").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{8,19}$/, "Вкажіть телефон, наприклад +380 67 123 45 67"),
  email: z.union([z.literal(""), z.email("Некоректний email")]).optional(),
  comment: z.string().trim().max(2000).optional(),
  items: z
    .array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(100000) }))
    .min(1, "Додайте хоча б один товар")
    .max(200),
});

export type RequestFormState =
  | { ok: true; id: number }
  | { ok: false; message?: string; fieldErrors?: Partial<Record<string, string>>; values: Record<string, string> }
  | null;

const FIELDS = ["company", "contactName", "phone", "email", "comment"] as const;

export async function submitPriceRequest(_prev: RequestFormState, formData: FormData): Promise<RequestFormState> {
  // React скидає форму після дії — повертаємо введене, щоб не змушувати заповнювати заново.
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "")]));

  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    items = [];
  }

  const parsed = schema.safeParse({ ...values, items });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, fieldErrors, values };
  }

  const { items: requested, email, comment, ...contact } = parsed.data;

  // Назви беремо з бази, а не від клієнта: у заявці мають бути актуальні дані товару.
  const products = await db.product.findMany({
    where: { id: { in: requested.map((i) => i.productId) }, isActive: true },
    select: { id: true, externalId: true, name: true, sku: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = requested.flatMap((i) => {
    const p = byId.get(i.productId);
    return p ? [{ productId: p.id, externalId: p.externalId, sku: p.sku, name: p.name, quantity: i.quantity }] : [];
  });

  if (lines.length === 0) {
    return { ok: false, message: "Товари із заявки більше недоступні. Оновіть список і спробуйте знову.", values };
  }

  const saved = await db.priceRequest.create({
    data: { ...contact, email: email || null, comment: comment || null, items: lines },
  });

  return { ok: true, id: saved.id };
}
