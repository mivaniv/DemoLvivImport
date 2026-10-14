import { runCleanup } from "../src/importer/run-cleanup";
import { cleanupOptions, createDb, printCleanup } from "./cli";

// Задача 2: npm run import:cleanup — приховує товари, відсутні в останньому повному вивантаженні.
const db = createDb();

runCleanup(db, cleanupOptions())
  .then((r) => {
    printCleanup(r);
    process.exitCode = r.status === "SUCCESS" ? 0 : 1;
  })
  .finally(() => db.$disconnect());
