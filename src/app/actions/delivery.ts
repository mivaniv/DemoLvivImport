import { z } from "zod";

// Доставка — спільна для оформлення замовлення (B2B) і кошика-заявки (каталог без цін)

export const deliveryShape = {
  deliveryMethod: z.enum(["OWN_LOGISTICS", "NOVA_POSHTA", "DELIVERY", "MEEST", "PICKUP"], { error: "Оберіть спосіб доставки" }),
  deliveryCity: z.string().trim().max(120).optional(),
  deliveryPoint: z.string().trim().max(300).optional(),
};

type Delivery = { deliveryMethod: string; deliveryCity?: string; deliveryPoint?: string };

export function refineDelivery(d: Delivery, ctx: z.RefinementCtx) {
  if (d.deliveryMethod === "PICKUP") return;
  if (!d.deliveryCity) ctx.addIssue({ code: "custom", path: ["deliveryCity"], message: "Вкажіть населений пункт" });
  if (!d.deliveryPoint) {
    ctx.addIssue({
      code: "custom",
      path: ["deliveryPoint"],
      message: d.deliveryMethod === "OWN_LOGISTICS" ? "Вкажіть адресу доставки" : "Вкажіть номер відділення",
    });
  }
}
