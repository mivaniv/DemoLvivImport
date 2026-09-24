import { readFile, stat } from "node:fs/promises";
import path from "node:path";

// Фото, які імпортер копіює у MEDIA_DIR. Не з public/, бо Next віддає лише файли,
// що існували під час збірки, а фото оновлюються щодня.

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

export async function GET(_req: Request, ctx: RouteContext<"/media/[...path]">) {
  const { path: parts } = await ctx.params;
  // turbopackIgnore: тека з'являється після збірки, трасувати її в бандл не потрібно
  const root = path.resolve(/*turbopackIgnore: true*/ process.env.MEDIA_DIR ?? "./storage/media");
  const file = path.resolve(/*turbopackIgnore: true*/ root, ...parts);
  const type = TYPES[path.extname(file).toLowerCase()];

  if (!file.startsWith(root + path.sep) || !type) return new Response("Not found", { status: 404 });

  try {
    const info = await stat(file);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(await readFile(file)), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        ...(type === "image/svg+xml" && { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" }),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
