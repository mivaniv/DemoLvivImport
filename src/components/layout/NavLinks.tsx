"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/components/layout/nav";

// У мобільному меню — ще й добірки, яких немає в основному рядку
const EXTRAS = [
  { href: "/new-products", label: "Новинки", match: ["/new-products"] },
  { href: "/popular", label: "Популярні позиції", match: ["/popular"] },
  { href: "/payment-and-delivery", label: "Оплата та доставка", match: ["/payment-and-delivery"] },
];

export function NavLinks({ className = "", itemClassName = "", withExtras = false }: { className?: string; itemClassName?: string; withExtras?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={className}>
      {(withExtras ? [...NAV, ...EXTRAS] : NAV).map((item) => {
        const active = item.match.some((m) => pathname.startsWith(m));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            // закриваємо мобільне меню (<details>) після переходу
            onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}
            className={`${itemClassName} transition hover:text-brand-600 ${active ? "text-brand-600" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
