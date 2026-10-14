import type { Prisma, PrismaClient } from "@/generated/prisma/client";

// Спільне для синхронізації й прибирання.

// Довільне число-ключ для pg_advisory_xact_lock: одночасно виконується лише одна задача імпорту
// (синхронізація або прибирання) — вони не можуть перетнутися.
const IMPORT_LOCK_KEY = 18_702_024;
// Запуск, що «висить» довше — ймовірно, процес упав; позначаємо його як невдалий.
const STALE_RUN_MS = 2 * 60 * 60 * 1000;

export type ImportError = { item: string; message: string };

// Очікувана зупинка задачі з поясненням для журналу (на відміну від непередбаченої помилки).
export class ImportAbort extends Error {}

export async function acquireImportLock(tx: Prisma.TransactionClient) {
  const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(${IMPORT_LOCK_KEY}) AS locked`;
  if (!locked) throw new ImportAbort("Інша задача імпорту вже виконується");
}

export async function failStaleRuns(db: PrismaClient) {
  await db.importRun.updateMany({
    where: { status: "RUNNING", startedAt: { lt: new Date(Date.now() - STALE_RUN_MS) } },
    data: { status: "FAILED", finishedAt: new Date(), message: "Перервано: процес не завершився" },
  });
}

export function failureMessage(e: unknown) {
  return e instanceof ImportAbort ? e.message : `Непередбачена помилка: ${(e as Error).message}`;
}
