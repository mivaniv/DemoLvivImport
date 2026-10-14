import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Завантаження вивантаження з 1С: за посиланням (http/https) або з локального файлу.
// Сира копія зберігається в storage/imports, щоб можна було розібрати проблемний запуск.

const TIMEOUT_MS = 120_000;
const MAX_BYTES = 200 * 1024 * 1024;
const RETRIES = 2;
const KEEP_FILES = 14;

export class SourceError extends Error {}

export type FetchedSource = { text: string; savedPath?: string };

export async function fetchSource(
  source: string,
  opts: { archiveDir?: string; auth?: { user: string; password: string } } = {},
): Promise<FetchedSource> {
  const text = /^https?:\/\//i.test(source) ? await download(source, opts.auth) : await readLocal(source);

  if (!text.trim()) throw new SourceError("Джерело повернуло порожній файл");

  const savedPath = opts.archiveDir ? await archive(text, opts.archiveDir, source) : undefined;
  return { text, savedPath };
}

async function readLocal(file: string) {
  try {
    return decode(await readFile(file), "");
  } catch (e) {
    throw new SourceError(`Не вдалося прочитати файл ${file}: ${(e as Error).message}`);
  }
}

async function download(url: string, auth?: { user: string; password: string }): Promise<string> {
  let lastError = "";
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 5_000 * attempt));
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: auth ? { Authorization: `Basic ${Buffer.from(`${auth.user}:${auth.password}`).toString("base64")}` } : {},
      });
      if (!res.ok) {
        lastError = `HTTP ${res.status} ${res.statusText}`;
        if (res.status >= 400 && res.status < 500) break; // 404/401 повтор не виправить
        continue;
      }
      const declared = Number(res.headers.get("content-length") ?? 0);
      if (declared > MAX_BYTES) throw new SourceError(`Файл завеликий: ${declared} байт`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_BYTES) throw new SourceError(`Файл завеликий: ${buf.length} байт`);
      return decode(buf, res.headers.get("content-type") ?? "");
    } catch (e) {
      if (e instanceof SourceError) throw e;
      lastError = (e as Error).name === "TimeoutError" ? `немає відповіді за ${TIMEOUT_MS / 1000} с` : (e as Error).message;
    }
  }
  throw new SourceError(`Джерело недоступне (${url}): ${lastError}`);
}

// 1С часто віддає XML у windows-1251 — кодування беремо із заголовка або XML-декларації.
function decode(buf: Buffer, contentType: string): string {
  const head = buf.subarray(0, 200).toString("latin1");
  const charset =
    /charset=([\w-]+)/i.exec(contentType)?.[1] ?? /<\?xml[^>]*encoding=["']([\w-]+)["']/i.exec(head)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset.toLowerCase()).decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}

async function archive(text: string, dir: string, source: string) {
  await mkdir(dir, { recursive: true });
  const ext = path.extname(source.split(/[?#]/)[0]) || ".xml";
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}${ext}`);
  await writeFile(file, text, "utf8");
  // лишаємо лише останні KEEP_FILES копій
  const files = (await readdir(dir)).sort();
  await Promise.all(files.slice(0, Math.max(0, files.length - KEEP_FILES)).map((f) => rm(path.join(dir, f), { force: true })));
  return file;
}
