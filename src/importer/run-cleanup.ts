import type { PrismaClient } from "@/generated/prisma/client";
import { acquireImportLock, failStaleRuns, failureMessage, ImportAbort } from "./shared";

// Задача 2 — прибирання: приховати товари, яких немає в останньому ПОВНОМУ вивантаженні.
// Працює лише після успішної синхронізації. Товари не видаляються: якщо товар знову з'явиться
// у файлі, синхронізація поверне його (isActive = true).

// Синхронізація, старіша за це, вважається неактуальною для прибирання.
const MAX_SYNC_AGE_MS = 24 * 60 * 60 * 1000;

export type CleanupResult = {
  runId: number;
  status: "SUCCESS" | "FAILED";
  syncRunId?: number;
  deactivated: number;
  message?: string;
};

export async function runCleanup(
  db: PrismaClient,
  opts: { maxRatio: number } = { maxRatio: 0.3 },
): Promise<CleanupResult> {
  await failStaleRuns(db);

  const sync = await db.importRun.findFirst({ where: { kind: "SYNC" }, orderBy: { startedAt: "desc" } });
  const run = await db.importRun.create({
    data: { kind: "CLEANUP", source: sync ? `після синхронізації #${sync.id}` : "—" },
  });

  let deactivated = 0;
  try {
    // Умови запуску: перевіряються до будь-яких змін.
    if (!sync) throw new ImportAbort("Синхронізація ще не виконувалась");
    if (sync.status !== "SUCCESS") throw new ImportAbort(`Остання синхронізація #${sync.id} не успішна — прибирання пропущено`);
    if (!sync.fullExport) throw new ImportAbort(`Синхронізація #${sync.id} містила лише зміни — відсутність товарів не враховується`);
    if (sync.cleanupDone) throw new ImportAbort(`Прибирання для синхронізації #${sync.id} уже виконано`);
    if (!sync.finishedAt || Date.now() - sync.finishedAt.getTime() > MAX_SYNC_AGE_MS) {
      throw new ImportAbort(`Синхронізація #${sync.id} старша за 24 год — спершу запустіть нову`);
    }

    await db.$transaction(async (tx) => {
      await acquireImportLock(tx);

      // Відсутні у файлі = активні товари, яких ця синхронізація не бачила.
      const missing = { isActive: true, OR: [{ lastSeenRunId: { not: sync.id } }, { lastSeenRunId: null }] };
      const [active, toHide] = await Promise.all([
        tx.product.count({ where: { isActive: true } }),
        tx.product.count({ where: missing }),
      ]);

      // Запобіжник від обрізаного чи помилкового файлу: не ховаємо значну частину каталогу за раз.
      if (active > 0 && toHide / active > opts.maxRatio) {
        throw new ImportAbort(
          `Прибирання приховало б ${toHide} з ${active} товарів (понад ${Math.round(opts.maxRatio * 100)}%) — пропущено, перевірте вивантаження`,
        );
      }

      const res = await tx.product.updateMany({ where: missing, data: { isActive: false, hiddenAt: new Date() } });
      deactivated = res.count;
      await tx.importRun.update({ where: { id: sync.id }, data: { cleanupDone: true } });
    });

    await db.importRun.update({
      where: { id: run.id },
      data: { status: "SUCCESS", finishedAt: new Date(), deactivated },
    });
    return { runId: run.id, status: "SUCCESS", syncRunId: sync.id, deactivated };
  } catch (e) {
    const message = failureMessage(e);
    await db.importRun.update({
      where: { id: run.id },
      data: { status: "FAILED", finishedAt: new Date(), deactivated: 0, message },
    });
    return { runId: run.id, status: "FAILED", syncRunId: sync?.id, deactivated: 0, message };
  }
}
