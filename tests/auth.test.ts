import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hashToken, newToken } from "@/lib/auth/tokens";

describe("паролі й токени", () => {
  it("хеш перевіряється лише правильним паролем, сіль щоразу нова", async () => {
    const a = await hashPassword("Пароль-123");
    const b = await hashPassword("Пароль-123");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("Пароль-123", a)).toBe(true);
    expect(await verifyPassword("пароль-123", a)).toBe(false);
    expect(await verifyPassword("x", "зіпсований-хеш")).toBe(false);
  });

  it("у базі зберігається лише хеш токена", () => {
    const t = newToken();
    expect(t.length).toBeGreaterThanOrEqual(43);
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).toBe(hashToken(t));
  });
});
