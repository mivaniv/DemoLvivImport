"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Огляд та імпорт", key: null },
  { href: "/admin/users", label: "Клієнти", key: "users" },
  { href: "/admin/orders", label: "Замовлення", key: "orders" },
  { href: "/admin/inquiries", label: "Звернення", key: "inquiries" },
  { href: "/admin/reviews", label: "Відгуки", key: "reviews" },
  { href: "/admin/products", label: "Товари", key: null },
] as const;

export function AdminTabs({ counts }: { counts: Record<"users" | "orders" | "inquiries" | "reviews", number> }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 ring-1 ring-line">
      {TABS.map((t) => {
        const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
        const count = t.key ? counts[t.key] : 0;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${active ? "bg-brand-600 text-white" : "text-muted hover:bg-canvas hover:text-ink"}`}
          >
            {t.label}
            {count > 0 && (
              <span className={`rounded-full px-1.5 text-[11px] font-bold ${active ? "bg-white text-brand-700" : "bg-gold text-navy-900"}`}>{count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
