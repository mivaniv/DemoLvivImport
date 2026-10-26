// Статична збірка: Node.js-сервера немає. next.config підставляє цей модуль замість inquiry.ts, review.ts,
// cart.ts і request.ts, функції виконуються в браузері.
// Форми надсилаються на PHP-обробник хостингу (NEXT_PUBLIC_FORM_ENDPOINT, deploy/hosting/api/form.php),
// який перевіряє поля й пересилає лист. Без нього (GitHub Pages) форма пропонує зв'язатися напряму.
import { MAIN_PHONE, OFFICE } from "@/content/company";
import { valuesOf, type FormState } from "./form-state";

const ENDPOINT = process.env.NEXT_PUBLIC_FORM_ENDPOINT;

const offline = (values?: Record<string, string>): FormState => ({
  ok: false,
  message: `Це демоверсія сайту без сервера — форма не надсилається. Зателефонуйте ${MAIN_PHONE.label} або напишіть на ${OFFICE.email}.`,
  values,
});

type Reply = { ok?: boolean; message?: string; fieldErrors?: Record<string, string> };

async function send(type: string, formData: FormData, fields: readonly string[], extra?: Record<string, unknown>): Promise<FormState> {
  const values = valuesOf(formData, fields);
  if (!ENDPOINT) return offline(values);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...values, ...extra, website: String(formData.get("website") ?? "") }),
    });
    const reply = (await res.json()) as Reply;
    if (reply.ok) return { ok: true, message: reply.message };
    return { ok: false, message: reply.message, fieldErrors: reply.fieldErrors, values };
  } catch {
    return { ok: false, message: `Не вдалося надіслати форму. Перевірте з'єднання або зателефонуйте ${MAIN_PHONE.label}.`, values };
  }
}

export async function submitCallback(_prev: FormState, formData: FormData): Promise<FormState> {
  return send("callback", formData, ["name", "phone", "message", "page"]);
}

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  return send("contact", formData, ["firstName", "lastName", "email", "phone", "organization", "position", "message"]);
}

export async function submitReview(_prev: FormState, formData: FormData): Promise<FormState> {
  return send("review", formData, ["rating", "text", "author", "email", "consent"]);
}

export async function submitRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  let items: unknown = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    // порожній кошик — відповість обробник
  }
  return send("request", formData, ["deliveryMethod", "deliveryCity", "deliveryPoint", "name", "phone", "company", "email", "comment"], { items });
}

export async function addToCart(_productId: number, _quantity: number) {
  return { ok: false, message: "Замовлення доступні в повній версії сайту" };
}

export const setCartQuantity = addToCart;

export async function removeFromCart(_productId: number) {
  return { ok: false, message: "Замовлення доступні в повній версії сайту" };
}

export async function placeOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  return offline(valuesOf(formData, ["deliveryMethod", "deliveryCity", "deliveryPoint", "recipientName", "recipientPhone", "comment"]));
}
