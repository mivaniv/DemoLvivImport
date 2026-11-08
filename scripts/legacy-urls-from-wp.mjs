// Таблиця старих адрес lvivimport.com (WordPress/WooCommerce) для переадресацій 301 після переходу.
//
//   node scripts/legacy-urls-from-wp.mjs <дамп-бази.sql.gz> <products.json нового сайту>
//
// Дамп — резервна копія бази WordPress (робить ~/wp-backup/make-backup.sh на хостингу, див. docs/cutover.md).
// Дамп лише читається; у репозиторій потрапляє тільки deploy/hosting/api/legacy-urls.json:
//   products   — стара адреса товару → код 1С (лише ті, чия адреса на новому сайті інша);
//   categories — стара адреса категорії → UUID категорії в 1С.
// Нову адресу legacy.php щоразу бере з data/products.json за кодом 1С / UUID, тож таблиця не застаріває.
import fs from "node:fs";
import zlib from "node:zlib";
import readline from "node:readline";

const [dumpPath, catalogPath] = process.argv.slice(2);
if (!dumpPath || !catalogPath) {
  console.error("node scripts/legacy-urls-from-wp.mjs <дамп.sql.gz> <products.json>");
  process.exit(2);
}

const want = new Set(["wp_posts", "wp_postmeta", "wp_terms", "wp_term_taxonomy", "wp_termmeta"]);
const columns = {};
const rows = Object.fromEntries([...want].map((t) => [t, []]));
const keepRow = {
  wp_posts: (r) => r.post_type === "product",
  wp_postmeta: (r) => r.meta_key === "_sku",
  wp_termmeta: (r) => r.meta_key === "uuid",
  wp_terms: () => true,
  wp_term_taxonomy: (r) => r.taxonomy === "product_cat",
};

// Рядки INSERT з дампу: (1,'текст з \' і \\',NULL),(...)
function parseValues(s, i, onRow) {
  const n = s.length;
  while (i < n) {
    while (i < n && s[i] !== "(") i++;
    if (i >= n) return;
    i++;
    const row = [];
    for (;;) {
      if (s[i] === "'") {
        i++;
        let out = "";
        for (;;) {
          const c = s[i];
          if (c === "\\") {
            const e = s[i + 1];
            out += { n: "\n", r: "\r", t: "\t", 0: "\0" }[e] ?? e;
            i += 2;
          } else if (c === "'") {
            if (s[i + 1] === "'") {
              out += "'";
              i += 2;
            } else {
              i++;
              break;
            }
          } else {
            out += c;
            i++;
          }
        }
        row.push(out);
      } else {
        let j = i;
        while (s[j] !== "," && s[j] !== ")") j++;
        const raw = s.slice(i, j);
        row.push(raw === "NULL" ? null : raw);
        i = j;
      }
      if (s[i] === ",") {
        i++;
        continue;
      }
      i++;
      break;
    }
    onRow(row);
  }
}

let table = null; // CREATE TABLE, що читається зараз
let inserting = null; // INSERT, рядки якого йдуть далі (MariaDB пише кожен рядок таблиці окремо)
const addRow = (t) => (r) => {
  const o = Object.fromEntries(columns[t].map((c, k) => [c, r[k]]));
  if (keepRow[t](o)) rows[t].push(o);
};
const rl = readline.createInterface({ input: fs.createReadStream(dumpPath).pipe(zlib.createGunzip()), crlfDelay: Infinity });
for await (const line of rl) {
  let m;
  if ((m = /^CREATE TABLE `([^`]+)`/.exec(line))) {
    table = want.has(m[1]) ? m[1] : null;
    if (table) columns[table] = [];
  } else if (table && (m = /^\s+`([^`]+)` /.exec(line))) {
    columns[table].push(m[1]);
  } else if (line.startsWith(") ")) {
    table = null;
  } else if ((m = /^INSERT INTO `([^`]+)` VALUES ?/.exec(line))) {
    inserting = want.has(m[1]) ? m[1] : null;
    if (inserting) parseValues(line, m[0].length, addRow(inserting));
  } else if (inserting && line.startsWith("(")) {
    parseValues(line, 0, addRow(inserting));
    if (line.endsWith(";")) inserting = null;
  } else {
    inserting = null;
  }
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const slugBySku = new Map(catalog.products.map((p) => [p.sku, p.slug]));
const currentSlugs = new Set(catalog.products.map((p) => p.slug));
const skuByPost = new Map(rows.wp_postmeta.map((r) => [r.post_id, r.meta_value]));

const products = {};
let same = 0;
let gone = 0;
for (const p of rows.wp_posts) {
  const slug = decodeURIComponent(p.post_name || "");
  if (!/^[a-z0-9-]+$/.test(slug)) continue; // .htaccess пропускає до legacy.php лише такі адреси
  const sku = skuByPost.get(p.ID) || null;
  if ((sku && slugBySku.get(sku) === slug) || currentSlugs.has(slug)) {
    same++;
    continue; // така адреса є й на новому сайті — переадресація не потрібна
  }
  if (!sku || !slugBySku.has(sku)) gone++;
  products[slug] = sku;
}

const termById = new Map(rows.wp_terms.map((t) => [t.term_id, t]));
const uuidByTerm = new Map(rows.wp_termmeta.map((t) => [t.term_id, t.meta_value]));
const categories = {};
for (const t of rows.wp_term_taxonomy) {
  const slug = decodeURIComponent(termById.get(t.term_id)?.slug || "");
  if (slug) categories[slug] = uuidByTerm.get(t.term_id) || null;
}

const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(
  "deploy/hosting/api/legacy-urls.json",
  JSON.stringify({ products: sorted(products), categories: sorted(categories) }, null, 1) + "\n",
);
console.log(
  `Товарів у WordPress: ${rows.wp_posts.length}; адреса та сама: ${same}; переадресацій: ${Object.keys(products).length} (з них у каталог — ${gone}).`,
);
console.log(`Категорій: ${Object.keys(categories).length}, з UUID 1С: ${Object.values(categories).filter(Boolean).length}.`);
