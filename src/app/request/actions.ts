"use server";

import { db } from "@/lib/db";
import { parseRequestForm, type RequestFormState } from "./request-schema";

export async function submitPriceRequest(_prev: RequestFormState, formData: FormData): Promise<RequestFormState> {
  const parsed = parseRequestForm(formData);
  if (!parsed.ok) return parsed.error;

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
    return {
      ok: false,
      message: "Товари із заявки більше недоступні. Оновіть список і спробуйте знову.",
      values: parsed.values,
    };
  }

  const saved = await db.priceRequest.create({
    data: { ...contact, email: email || null, comment: comment || null, items: lines },
  });

  return { ok: true, id: saved.id };
}
