import { runCleanup } from "../src/importer/run-cleanup";
import { runSync } from "../src/importer/run-sync";
import { cleanupOptions, createDb, printCleanup, printSync, resolveSource, syncOptions } from "./cli";

// Щоденний запуск для cron: синхронізація, а потім прибирання — лише якщо синхронізація успішна
// і файл містить повний каталог. Приклад crontab: 0 5 * * * cd /app && npm run import:daily >> import.log 2>&1
const db = createDb();

async function main() {
  const sync = await runSync(db, resolveSource(process.argv[2]), syncOptions());
  printSync(sync);
  if (sync.status !== "SUCCESS") return 1;
  if (!sync.fullExport) {
    console.log("  Прибирання не запускається: вивантаження містить лише зміни");
    return 0;
  }
  const cleanup = await runCleanup(db, cleanupOptions());
  printCleanup(cleanup);
  return cleanup.status === "SUCCESS" ? 0 : 1;
}

main()
  .then((code) => (process.exitCode = code))
  .finally(() => db.$disconnect());
