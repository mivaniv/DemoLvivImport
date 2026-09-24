import snapshot from "@/data/catalog-snapshot.json";
import { CONTACT } from "@/lib/contacts";
import { parseRequestForm, type RequestFormState } from "./request-schema";

// Статична версія (GitHub Pages): сервера немає, тож заявка формується листом у поштовій програмі.
// Виконується в браузері; next.config підставляє цей модуль замість actions.ts.
export async function submitPriceRequest(_prev: RequestFormState, formData: FormData): Promise<RequestFormState> {
  const parsed = parseRequestForm(formData);
  if (!parsed.ok) return parsed.error;

  const { items, company, contactName, phone, email, comment } = parsed.data;
  const byId = new Map(snapshot.products.map((p) => [p.id, p]));
  const lines = items.map((i, n) => {
    const p = byId.get(i.productId);
    return `${n + 1}. ${p?.name ?? `Товар #${i.productId}`}${p?.sku ? ` (${p.sku})` : ""} — ${i.quantity} шт.`;
  });

  const body = [
    "Добрий день! Прошу надіслати ціни та умови поставки.",
    "",
    ...lines,
    "",
    `Компанія: ${company}`,
    `Контактна особа: ${contactName}`,
    `Телефон: ${phone}`,
    email ? `Email: ${email}` : "",
    comment ? `Коментар: ${comment}` : "",
  ]
    .filter((l, i, all) => l !== "" || all[i - 1] !== "")
    .join("\n");

  window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(`Заявка на ціни — ${company}`)}&body=${encodeURIComponent(body)}`;
  return { ok: true, id: null };
}
