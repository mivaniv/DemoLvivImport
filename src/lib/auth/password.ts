import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Паролі: scrypt із вбудованого node:crypto (без зовнішніх залежностей).
// Формат збереження: scrypt$N$r$p$<salt base64>$<hash base64> — параметри можна змінити згодом.

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 64;

function derive(password: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEYLEN, { ...opts, maxmem: 128 * N * R * 2 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const key = await derive(password, Buffer.from(saltB64, "base64"), { N: Number(n), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export { PASSWORD_MIN_LENGTH } from "./password-rules";
