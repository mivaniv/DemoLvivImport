import Link from "next/link";
import type { ComponentProps } from "react";
import { asset } from "@/lib/asset";

// Посилання на сторінку товару. У статичній збірці товари відкриває один шаблон (ProductScreen),
// і даних для переходу без перезавантаження в Next немає — тож звичайне посилання: без фонових
// запитів за кожною карткою каталогу, які повертали б 404.
const STATIC = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

export function ProductLink({ slug, ...props }: Omit<ComponentProps<"a">, "href"> & { slug: string }) {
  const href = `/product/${slug}${STATIC ? "/" : ""}`;
  return STATIC ? <a href={asset(href)} {...props} /> : <Link href={href} {...props} />;
}
