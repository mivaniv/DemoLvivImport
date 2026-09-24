// next/image не додає basePath до src (див. документацію basePath → Images).
// На GitHub Pages сайт живе в підкаталозі /<repo>/, тож локальні шляхи префіксуємо вручну.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(src: string): string {
  return BASE && src.startsWith("/") && !src.startsWith("//") ? `${BASE}${src}` : src;
}
