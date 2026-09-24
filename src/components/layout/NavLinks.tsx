"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/components/layout/nav";

export function NavLinks({ className = "", itemClassName = "" }: { className?: string; itemClassName?: string }) {
  const pathname = usePathname();
  return (
    <nav className={className}>
      {NAV.map((item) => {
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
