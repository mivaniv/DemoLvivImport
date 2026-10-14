import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";

// Листи: через SMTP (SMTP_URL), а без нього — у теку storage/mail (.eml), щоб у розробці
// можна було відкрити лист і перейти за посиланням (наприклад, скидання пароля).

const FROM = process.env.MAIL_FROM || "Львівімпорт <info@lvivimport.com>";
export const MANAGER_EMAIL = process.env.MANAGER_EMAIL || "info@lvivimport.com";

type Mail = { to: string; subject: string; text: string; replyTo?: string };

export async function sendMail(mail: Mail): Promise<void> {
  const message = { from: FROM, ...mail };
  try {
    if (process.env.SMTP_URL) {
      await nodemailer.createTransport(process.env.SMTP_URL).sendMail(message);
      return;
    }
    const info = await nodemailer.createTransport({ streamTransport: true, buffer: true }).sendMail(message);
    // turbopackIgnore: тека для листів у розробці, у серверний бандл її трасувати не треба
    const dir = path.resolve(/*turbopackIgnore: true*/ process.env.MAIL_OUTBOX_DIR ?? "./storage/mail");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${mail.to.replace(/[^\w.@-]/g, "_")}.eml`);
    await writeFile(file, info.message as Buffer);
    console.log(`[mail] SMTP не налаштовано — лист збережено: ${file}`);
  } catch (e) {
    // Лист — супутня дія: його збій не повинен ламати реєстрацію чи замовлення.
    console.error("[mail] не вдалося надіслати лист:", (e as Error).message);
  }
}

export function siteUrl(pathname: string): string {
  const base = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${pathname}`;
}
