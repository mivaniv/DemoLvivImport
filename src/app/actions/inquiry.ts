"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { MANAGER_EMAIL, sendMail } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { fieldErrorsOf, PHONE_RE, valuesOf, type FormState } from "./form-state";

// «Замовити дзвінок» / «Отримати консультацію» та форма зворотного зв'язку на сторінці контактів.

async function clientKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

const callbackSchema = z.object({
  name: z.string().trim().min(2, "Вкажіть ім'я").max(120),
  phone: z.string().trim().regex(PHONE_RE, "Вкажіть телефон, наприклад +380 67 123 45 67"),
  message: z.string().trim().max(1000).optional(),
  page: z.string().max(300).optional(),
});

export async function submitCallback(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = valuesOf(formData, ["name", "phone", "message", "page"]);
  if (formData.get("website")) return { ok: true }; // приманка для ботів
  if (!rateLimit(`callback:${await clientKey()}`, 5, 10 * 60_000)) {
    return { ok: false, message: "Забагато звернень. Спробуйте за кілька хвилин або зателефонуйте нам.", values };
  }
  const parsed = callbackSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error.issues), values };

  const { name, phone, message, page } = parsed.data;
  await db.inquiry.create({ data: { kind: "CALLBACK", name, phone, message: message || null, page: page || null } });
  await sendMail({
    to: MANAGER_EMAIL,
    subject: `Замовлення дзвінка: ${name}, ${phone}`,
    text: [`Ім'я: ${name}`, `Телефон: ${phone}`, message && `Питання: ${message}`, page && `Сторінка: ${page}`].filter(Boolean).join("\n"),
  });
  return { ok: true, message: "Дякуємо! Менеджер зателефонує вам найближчим часом." };
}

const contactSchema = z.object({
  firstName: z.string().trim().min(2, "Вкажіть ім'я").max(80),
  lastName: z.string().trim().max(80).optional(),
  email: z.email("Некоректний email"),
  phone: z.string().trim().regex(PHONE_RE, "Вкажіть телефон, наприклад +380 67 123 45 67"),
  organization: z.string().trim().max(200).optional(),
  position: z.string().trim().max(120).optional(),
  message: z.string().trim().min(5, "Напишіть повідомлення").max(5000),
});

const CONTACT_FIELDS = ["firstName", "lastName", "email", "phone", "organization", "position", "message"] as const;

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = valuesOf(formData, CONTACT_FIELDS);
  if (formData.get("website")) return { ok: true };
  if (!rateLimit(`contact:${await clientKey()}`, 5, 10 * 60_000)) {
    return { ok: false, message: "Забагато звернень. Спробуйте пізніше.", values };
  }
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error.issues), values };

  const d = parsed.data;
  const name = [d.firstName, d.lastName].filter(Boolean).join(" ");
  await db.inquiry.create({
    data: {
      kind: "CONTACT",
      name,
      email: d.email,
      phone: d.phone,
      organization: d.organization || null,
      position: d.position || null,
      message: d.message,
    },
  });
  await sendMail({
    to: MANAGER_EMAIL,
    replyTo: d.email,
    subject: `Повідомлення з сайту: ${name}${d.organization ? `, ${d.organization}` : ""}`,
    text: [
      `Ім'я: ${name}`,
      `Email: ${d.email}`,
      `Телефон: ${d.phone}`,
      d.organization && `Організація: ${d.organization}`,
      d.position && `Посада: ${d.position}`,
      "",
      d.message,
    ]
      .filter((l) => l !== undefined && l !== "")
      .join("\n"),
  });
  return { ok: true, message: "Дякуємо! Ми отримали ваше повідомлення й відповімо найближчим часом." };
}
