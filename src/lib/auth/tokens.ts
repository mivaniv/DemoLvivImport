import { createHash, randomBytes } from "node:crypto";

// Випадкові токени (сесія, скидання пароля): клієнт отримує сам токен, у базі — лише SHA-256.
// Навіть із дампом бази не можна увійти чи скинути пароль.

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
