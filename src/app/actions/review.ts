"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { MANAGER_EMAIL, sendMail, siteUrl } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { fieldErrorsOf, valuesOf, type FormState } from "./form-state";

// Відгук потрапляє на сайт лише після модерації в адмінпанелі.

const schema = z.object({
  rating: z.coerce.number().int().min(1, "Оберіть оцінку").max(5),
  text: z.string().trim().min(10, "Напишіть кілька слів про співпрацю").max(3000),
  author: z.string().trim().min(2, "Вкажіть ім'я").max(80),
  email: z.union([z.literal(""), z.email("Некоректний email")]).optional(),
  consent: z.literal("on", { error: "Потрібна згода на обробку персональних даних" }),
});

export async function submitReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = valuesOf(formData, ["rating", "text", "author", "email", "consent"]);
  if (formData.get("website")) return { ok: true };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`review:${ip}`, 3, 60 * 60_000)) {
    return { ok: false, message: "Забагато відгуків з цієї адреси. Спробуйте пізніше.", values };
  }
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error.issues), values };

  const { rating, text, author, email } = parsed.data;
  await db.review.create({ data: { rating, text, author, email: email || null } });
  await sendMail({
    to: MANAGER_EMAIL,
    subject: `Новий відгук на модерацію: ${author}, ${rating}/5`,
    text: `${text}\n\nПереглянути й опублікувати: ${siteUrl("/admin/reviews")}`,
  });
  return { ok: true, message: "Дякуємо за відгук! Він з'явиться на сайті після перевірки модератором." };
}
