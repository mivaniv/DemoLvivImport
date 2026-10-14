import { runSync } from "../src/importer/run-sync";
import { createDb, printSync, resolveSource, syncOptions } from "./cli";

// Задача 1: npm run import:sync [-- <посилання або файл>]  (за замовчуванням — IMPORT_SOURCE_URL)
const db = createDb();

runSync(db, resolveSource(process.argv[2]), syncOptions())
  .then((r) => {
    printSync(r);
    process.exitCode = r.status === "SUCCESS" ? 0 : 1;
  })
  .finally(() => db.$disconnect());
