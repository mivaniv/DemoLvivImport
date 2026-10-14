import "dotenv/config";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { CleanupResult } from "../src/importer/run-cleanup";
import type { SyncOptions, SyncResult } from "../src/importer/run-sync";

// Спільне для команд імпорту: підключення до бази, налаштування з .env і вивід результатів.

export function createDb() {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
}

export function resolveSource(arg: string | undefined): string {
  const source = arg ?? process.env.IMPORT_SOURCE_URL;
  if (!source) {
    console.error("Не задано джерело: вкажіть IMPORT_SOURCE_URL у .env або передайте шлях/посилання аргументом");
    process.exit(2);
  }
  return /^https?:\/\//i.test(source) ? source : path.resolve(source);
}

export function syncOptions(): SyncOptions {
  const user = process.env.IMPORT_SOURCE_USER;
  const password = process.env.IMPORT_SOURCE_PASSWORD;
  return {
    mediaDir: path.resolve(process.env.MEDIA_DIR ?? "./storage/media"),
    archiveDir: path.resolve(process.env.IMPORT_ARCHIVE_DIR ?? "./storage/imports"),
    auth: user && password ? { user, password } : undefined,
    priceType: process.env.IMPORT_PRICE_TYPE || undefined,
  };
}

export function cleanupOptions() {
  const ratio = Number.parseFloat(process.env.IMPORT_CLEANUP_MAX_RATIO ?? "");
  return { maxRatio: Number.isFinite(ratio) && ratio > 0 && ratio <= 1 ? ratio : 0.3 };
}

const stamp = () => new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" });

export function printSync(r: SyncResult) {
  console.log(`[${stamp()}] Синхронізація #${r.runId}: ${r.status}${r.fullExport ? " (повний каталог)" : ""}`);
  console.log(`  у файлі: ${r.total}, створено: ${r.created}, оновлено: ${r.updated}, відновлено: ${r.restored}`);
  if (r.message) console.log(`  ${r.message}`);
  for (const e of r.errors.slice(0, 20)) console.log(`  ! ${e.item}: ${e.message}`);
  if (r.errors.length > 20) console.log(`  … ще ${r.errors.length - 20} (див. /admin)`);
}

export function printCleanup(r: CleanupResult) {
  console.log(`[${stamp()}] Прибирання #${r.runId}: ${r.status}, приховано: ${r.deactivated}`);
  if (r.message) console.log(`  ${r.message}`);
}
