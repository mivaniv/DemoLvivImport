// Підписи для замовлень — спільні для кабінету, адмінпанелі й листів.
import type { DeliveryMethod, OrderStatus } from "@/generated/prisma/enums";

export const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  OWN_LOGISTICS: "Власна логістика Львівімпорт",
  NOVA_POSHTA: "Нова пошта",
  DELIVERY: "Делівері",
  MEEST: "Meest",
  PICKUP: "Самовивіз зі складу (м. Львів, вул. В. Великого, 2)",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Нове",
  CONFIRMED: "Підтверджене",
  SHIPPED: "Відвантажене",
  DONE: "Виконане",
  CANCELLED: "Скасоване",
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  NEW: "bg-brand-50 text-brand-700",
  CONFIRMED: "bg-amber-50 text-amber-700",
  SHIPPED: "bg-sky-50 text-sky-700",
  DONE: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};
