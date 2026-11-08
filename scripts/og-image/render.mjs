// Картинка для прев'ю посилань у месенджерах і соцмережах (Open Graph, 1200×630):
// рендерить шаблон og.html у headless Edge/Chrome і зберігає src/app/opengraph-image.jpg.
// Next.js сам додає теги og:image на всі сторінки (файлова конвенція opengraph-image).
//
//   node scripts/og-image/render.mjs            (браузер шукається сам; або BROWSER=шлях/до/chrome)
//
// Потрібні інтернет (шрифт Manrope з Google Fonts) і sharp (встановлюється разом із Next).
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const WIDTH = 1200;
const HEIGHT = 630;
const OUT = join(ROOT, "src/app/opengraph-image.jpg");
const ALT = "Lviv Import — європейські продукти для бізнесу";

// Логотип — той самий SVG, що в шапці сайту (JSX → звичайна розмітка SVG)
function logoSvg() {
  const tsx = readFileSync(join(ROOT, "src/components/layout/Logo.tsx"), "utf8");
  const colors = Object.fromEntries([...tsx.matchAll(/const (\w+) = "(#[0-9A-Fa-f]{3,8})";/g)].map((m) => [m[1], m[2]]));
  const svg = tsx.match(/<svg[\s\S]*?<\/svg>/)?.[0];
  if (!svg) throw new Error("Не знайдено <svg> у Logo.tsx");
  return svg
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/fill=\{(\w+)\}/g, (_, name) => {
      if (!colors[name]) throw new Error(`Невідомий колір ${name} у Logo.tsx`);
      return `fill="${colors[name]}"`;
    })
    .replace(/fillRule=/g, "fill-rule=")
    .replace(/clipRule=/g, "clip-rule=")
    .replace(/\s(className|role|aria-hidden)="[^"]*"/g, "");
}

function findBrowser() {
  const candidates = [
    process.env.BROWSER,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("Не знайдено Edge/Chrome — вкажіть шлях у змінній BROWSER");
  return found;
}

const tmp = mkdtempSync(join(tmpdir(), "og-image-"));
try {
  const html = readFileSync(join(ROOT, "scripts/og-image/og.html"), "utf8")
    .replaceAll("{{LOGO}}", logoSvg())
    .replaceAll("{{HOME}}", pathToFileURL(join(ROOT, "public/home")).href);
  const page = join(tmp, "og.html");
  const png = join(tmp, "og.png");
  writeFileSync(page, html);

  const run = spawnSync(findBrowser(), [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    `--user-data-dir=${join(tmp, "profile")}`,
    "--force-device-scale-factor=1",
    `--window-size=${WIDTH},${HEIGHT}`,
    "--virtual-time-budget=10000", // час на шрифти й картинки до знімка
    `--screenshot=${png}`,
    pathToFileURL(page).href,
  ], { encoding: "utf8", timeout: 120000 });
  if (!existsSync(png)) throw new Error(`Браузер не зробив знімок: ${run.error?.message ?? run.stderr}`);

  const { width = 0, height = 0 } = await sharp(png).metadata();
  if (width < WIDTH || height < HEIGHT) throw new Error(`Знімок ${width}×${height}, менший за ${WIDTH}×${HEIGHT}`);
  await sharp(png)
    .extract({ left: 0, top: 0, width: WIDTH, height: HEIGHT })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(OUT);
  writeFileSync(join(ROOT, "src/app/opengraph-image.alt.txt"), ALT);
  const kb = Math.round(readFileSync(OUT).length / 1024);
  console.log(`Готово: src/app/opengraph-image.jpg (${WIDTH}×${HEIGHT}, ${kb} КБ; знімок ${width}×${height})`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
