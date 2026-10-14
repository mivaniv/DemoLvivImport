"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword, PASSWORD_MIN_LENGTH, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getViewer } from "@/lib/auth/session";
import { hashToken, newToken } from "@/lib/auth/tokens";
import { db } from "@/lib/db";
import { B2B_ENABLED } from "@/lib/features";
import { MANAGER_EMAIL, sendMail, siteUrl } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { fieldErrorsOf, PHONE_RE, valuesOf, type FormState } from "./form-state";

const ip = async () => (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

// Куди повернути після входу: лише внутрішні шляхи (захист від open redirect)
function safeNext(next: FormDataEntryValue | null, fallback = "/account") {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}

const emailField = z.email("Некоректний email").transform((e) => e.trim().toLowerCase());
const passwordField = z.string().min(PASSWORD_MIN_LENGTH, `Пароль — щонайменше ${PASSWORD_MIN_LENGTH} символів`).max(200);

// ---------- Вхід / вихід ----------

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = valuesOf(formData, ["email"]);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, message: "Введіть email і пароль", values };
  if (!rateLimit(`login:${await ip()}:${email}`, 8, 15 * 60_000)) {
    return { ok: false, message: "Забагато спроб входу. Спробуйте через 15 хвилин.", values };
  }

  const user = await db.user.findUnique({ where: { email } });
  // Однакова відповідь для неіснуючого email і хибного пароля — не підказуємо, які адреси зареєстровані
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, message: "Неправильний email або пароль", values };
  }
  if (user.status === "BLOCKED") {
    return { ok: false, message: "Доступ до кабінету призупинено. Зверніться до менеджера.", values };
  }

  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  redirect(safeNext(formData.get("next"), user.role === "ADMIN" ? "/admin" : "/account"));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

// ---------- Реєстрація (заявка, підтверджує менеджер) ----------

const registerSchema = z
  .object({
    company: z.string().trim().min(2, "Вкажіть назву компанії або ФОП").max(200),
    edrpou: z.string().trim().regex(/^\d{8}(\d{2})?$/, "Код ЄДРПОУ — 8 цифр, ІПН — 10 цифр"),
    contactName: z.string().trim().min(2, "Вкажіть контактну особу").max(120),
    phone: z.string().trim().regex(PHONE_RE, "Вкажіть телефон, наприклад +380 67 123 45 67"),
    city: z.string().trim().min(2, "Вкажіть місто").max(120),
    email: emailField,
    password: passwordField,
    password2: z.string(),
    consent: z.literal("on", { error: "Потрібна згода з умовами використання" }),
  })
  .refine((d) => d.password === d.password2, { path: ["password2"], message: "Паролі не збігаються" });

const REGISTER_FIELDS = ["company", "edrpou", "contactName", "phone", "city", "email", "password", "password2", "consent"] as const;

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const all = valuesOf(formData, REGISTER_FIELDS);
  const { password: _p, password2: _p2, ...values } = all; // паролі назад у форму не повертаємо
  if (formData.get("website")) return { ok: true };
  if (!B2B_ENABLED) return { ok: false, message: "Реєстрація поки недоступна. Зателефонуйте нам — менеджер усе розповість.", values };
  if (!rateLimit(`register:${await ip()}`, 5, 60 * 60_000)) {
    return { ok: false, message: "Забагато заявок з цієї адреси. Спробуйте пізніше.", values };
  }
  const parsed = registerSchema.safeParse(all);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error.issues), values };

  const d = parsed.data;
  if (await db.user.findUnique({ where: { email: d.email } })) {
    return { ok: false, fieldErrors: { email: "Цей email уже зареєстровано. Увійдіть або відновіть пароль." }, values };
  }

  const user = await db.user.create({
    data: {
      email: d.email,
      passwordHash: await hashPassword(d.password),
      company: d.company,
      edrpou: d.edrpou,
      contactName: d.contactName,
      phone: d.phone,
      city: d.city,
    },
  });

  await Promise.all([
    sendMail({
      to: MANAGER_EMAIL,
      replyTo: d.email,
      subject: `Заявка на реєстрацію: ${d.company}`,
      text: [
        `Компанія: ${d.company}`,
        `ЄДРПОУ/ІПН: ${d.edrpou}`,
        `Контактна особа: ${d.contactName}`,
        `Телефон: ${d.phone}`,
        `Місто: ${d.city}`,
        `Email: ${d.email}`,
        "",
        `Підтвердити доступ: ${siteUrl("/admin/users")}`,
      ].join("\n"),
    }),
    sendMail({
      to: d.email,
      subject: "Заявку на реєстрацію отримано — Львівімпорт",
      text: `Дякуємо, ${d.contactName}!\n\nМи отримали заявку для «${d.company}». Менеджер перевірить дані й відкриє доступ до цін і замовлень — ми повідомимо листом.\n\nКабінет: ${siteUrl("/account")}`,
    }),
  ]);

  await createSession(user.id);
  redirect("/account?registered=1");
}

// ---------- Відновлення пароля ----------

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const done: FormState = { ok: true, message: "Якщо такий email зареєстровано, ми надіслали лист із посиланням для зміни пароля." };
  if (!z.email().safeParse(email).success) return { ok: false, fieldErrors: { email: "Некоректний email" }, values: { email } };
  if (!rateLimit(`reset:${await ip()}`, 5, 60 * 60_000)) return done; // не підказуємо про ліміт

  const user = await db.user.findUnique({ where: { email } });
  if (user && user.status !== "BLOCKED") {
    const token = newToken();
    await db.passwordResetToken.create({
      data: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 60 * 60_000) },
    });
    await sendMail({
      to: user.email,
      subject: "Зміна пароля — Львівімпорт",
      text: `Щоб задати новий пароль, перейдіть за посиланням (діє 1 годину):\n${siteUrl(`/account/reset-password?token=${token}`)}\n\nЯкщо ви не запитували зміну пароля, просто проігноруйте цей лист.`,
    });
  }
  return done;
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const parsed = z
    .object({ password: passwordField, password2: z.string() })
    .refine((d) => d.password === d.password2, { path: ["password2"], message: "Паролі не збігаються" })
    .safeParse({ password: formData.get("password"), password2: formData.get("password2") });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error.issues) };

  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, message: "Посилання недійсне або застаріло. Запросіть нове." };
  }

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(parsed.data.password) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Після зміни пароля виходимо з усіх пристроїв
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  await createSession(record.userId);
  redirect("/account?password=changed");
}

// ---------- Кабінет ----------

const profileSchema = z.object({
  company: z.string().trim().min(2, "Вкажіть назву компанії").max(200),
  edrpou: z.string().trim().regex(/^\d{8}(\d{2})?$/, "Код ЄДРПОУ — 8 цифр, ІПН — 10 цифр"),
  contactName: z.string().trim().min(2, "Вкажіть контактну особу").max(120),
  phone: z.string().trim().regex(PHONE_RE, "Некоректний телефон"),
  city: z.string().trim().max(120).optional(),
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Сесія завершилась — увійдіть знову" };
  const values = valuesOf(formData, ["company", "edrpou", "contactName", "phone", "city"]);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error.issues), values };
  await db.user.update({ where: { id: viewer.id }, data: { ...parsed.data, city: parsed.data.city || null } });
  return { ok: true, message: "Дані збережено" };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Сесія завершилась — увійдіть знову" };
  const parsed = z
    .object({ current: z.string().min(1, "Введіть поточний пароль"), password: passwordField, password2: z.string() })
    .refine((d) => d.password === d.password2, { path: ["password2"], message: "Паролі не збігаються" })
    .safeParse({ current: formData.get("current"), password: formData.get("password"), password2: formData.get("password2") });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error.issues) };

  const user = await db.user.findUniqueOrThrow({ where: { id: viewer.id } });
  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) {
    return { ok: false, fieldErrors: { current: "Неправильний поточний пароль" } };
  }
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } }),
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await createSession(user.id);
  return { ok: true, message: "Пароль змінено. Інші пристрої вийшли з кабінету." };
}
