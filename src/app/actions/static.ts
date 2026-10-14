// Статична збірка (GitHub Pages): сервера немає, тож форми не можуть нічого зберегти.
// next.config підставляє цей модуль замість inquiry.ts, review.ts і cart.ts.
// Функції виконуються в браузері й пропонують зв'язатися напряму.
import { MAIN_PHONE, OFFICE } from "@/content/company";
import type { FormState } from "./form-state";

const offline = (): FormState => ({
  ok: false,
  message: `Це демоверсія сайту без сервера — форма не надсилається. Зателефонуйте ${MAIN_PHONE.label} або напишіть на ${OFFICE.email}.`,
});

export async function submitCallback(_prev: FormState, _formData: FormData): Promise<FormState> {
  return offline();
}

export async function submitContact(_prev: FormState, _formData: FormData): Promise<FormState> {
  return offline();
}

export async function submitReview(_prev: FormState, _formData: FormData): Promise<FormState> {
  return offline();
}

export async function addToCart(_productId: number, _quantity: number) {
  return { ok: false, message: "Замовлення доступні в повній версії сайту" };
}

export const setCartQuantity = addToCart;

export async function removeFromCart(_productId: number) {
  return { ok: false, message: "Замовлення доступні в повній версії сайту" };
}

export async function placeOrder(_prev: FormState, _formData: FormData): Promise<FormState> {
  return offline();
}
