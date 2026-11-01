import { readFileSync, writeFileSync } from "node:fs";
import { fetchSource, SourceError } from "../src/importer/fetch-source";
import { FeedError, feedToCatalog, type PreviousCatalog } from "../src/importer/feed-to-catalog";
import { resolveSource, syncOptions } from "./cli";

// Оновлює знімок каталогу статичної версії (src/data/catalog-snapshot.json) прямо з вивантаження 1С,
// без бази. На хостингу те саме щодня робить крон (deploy/hosting/api/update-catalog.php).
// npm run catalog:from-feed -- <файл або посилання>   (типово — IMPORT_SOURCE_URL з .env)

const SNAPSHOT = "src/data/catalog-snapshot.json";

async function main() {
  const source = resolveSource(process.argv[2]);
  const opts = syncOptions();
  const previous = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as PreviousCatalog & { generatedAt: string; reviews: unknown[] };

  const { text } = await fetchSource(source, { archiveDir: opts.archiveDir, auth: opts.auth });
  const { catalog, report } = feedToCatalog(text, previous, {
    sourceUrl: /^https?:\/\//i.test(source) ? source : undefined,
    imageBase: opts.imageBase,
  });

  const same = JSON.stringify(catalog) === JSON.stringify({ categories: previous.categories, brands: previous.brands, products: previous.products });
  const snapshot = { generatedAt: same ? previous.generatedAt : new Date().toISOString(), ...catalog, reviews: previous.reviews };
  writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2) + "\n");

  console.log(`У файлі: ${report.total}; на сайті: ${catalog.products.length} (нових ${report.created}, вилучено ${report.removed})`);
  console.log(`Категорій: ${catalog.categories.length}, брендів: ${catalog.brands.length}${same ? " — каталог не змінився" : ""}`);
  for (const w of report.warnings.slice(0, 20)) console.log(`  ! ${w}`);
  if (report.warnings.length > 20) console.log(`  … ще ${report.warnings.length - 20}`);
}

main().catch((e) => {
  console.error(e instanceof FeedError || e instanceof SourceError ? e.message : e);
  process.exitCode = 1;
});
