import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { B2B_ENABLED } from "@/lib/features";
import { hashToken, newToken } from "./tokens";

// Сесії в базі даних (рекомендація Next.js: Database Sessions + Data Access Layer).
// Перевага над JWT: менеджер може заблокувати клієнта — і доступ зникає одразу.
// У статичній збірці (GitHub Pages) модуль підміняється session.static.ts.

const COOKIE = "li_session";
const SESSION_DAYS = 30;

export type Viewer = {
  id: number;
  email: string;
  company: string;
  contactName: string;
  role: "CLIENT" | "ADMIN";
  status: "PENDING" | "ACTIVE" | "BLOCKED";
  // Ціни й замовлення — лише для підтверджених клієнтів (і адміністраторів)
  canOrder: boolean;
};

export async function createSession(userId: number) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(COOKIE);
}

// Поточний користувач; кешується в межах одного запиту.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: { select: { id: true, email: true, company: true, contactName: true, role: true, status: true } },
    },
  });
  if (!session || session.expiresAt < new Date() || session.user.status === "BLOCKED") return null;
  const u = session.user;
  // Поки B2B вимкнено, ціни бачить лише адміністратор (щоб перевіряти імпорт), клієнти — ні.
  return { ...u, canOrder: u.role === "ADMIN" || (B2B_ENABLED && u.status === "ACTIVE") };
});

export async function requireViewer(next = "/account"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return viewer;
}

export async function requireClient(next = "/account"): Promise<Viewer> {
  const viewer = await requireViewer(next);
  if (!viewer.canOrder) redirect("/account");
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  if (viewer.role !== "ADMIN") redirect("/account");
  return viewer;
}
