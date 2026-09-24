import "dotenv/config";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { runImport } from "../src/importer/run-import";

// Використання: npm run import -- <шлях до файлу вивантаження>
// Для щоденного запуску — Планувальник завдань Windows або cron на сервері.

const file = process.argv[2];
if (!file) {
  console.error("Вкажіть файл: npm run import -- data/1c-sample/catalog.json");
  process.exit(2);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const mediaDir = path.resolve(process.env.MEDIA_DIR ?? "./storage/media");

runImport(db, path.resolve(file), { mediaDir })
  .then((r) => {
    console.log(`Імпорт #${r.runId}: ${r.status}`);
    console.log(`  усього у файлі: ${r.total}, створено: ${r.created}, оновлено: ${r.updated}, приховано: ${r.deactivated}`);
    if (r.message) console.log(`  ${r.message}`);
    for (const e of r.errors.slice(0, 20)) console.log(`  ! ${e.item}: ${e.message}`);
    if (r.errors.length > 20) console.log(`  … ще ${r.errors.length - 20} (див. /admin)`);
    process.exitCode = r.status === "SUCCESS" ? 0 : 1;
  })
  .finally(() => db.$disconnect());
