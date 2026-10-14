import { runSync } from "../src/importer/run-sync";
import { createDb, printSync, resolveSource, syncOptions } from "./cli";

// Ручний імпорт одного файлу (JSON, YML або CommerceML): npm run import -- <файл або посилання>
// Те саме, що import:sync, але джерело обов'язково вказується аргументом.
if (!process.argv[2]) {
  console.error("Вкажіть файл: npm run import -- data/1c-sample/catalog.json");
  process.exit(2);
}

const db = createDb();

runSync(db, resolveSource(process.argv[2]), syncOptions())
  .then((r) => {
    printSync(r);
    process.exitCode = r.status === "SUCCESS" ? 0 : 1;
  })
  .finally(() => db.$disconnect());
