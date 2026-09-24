"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRequest } from "@/components/request/RequestProvider";

export function RequestButton() {
  const { count, ready } = useRequest();
  return (
    <Link
      href="/request"
      className="relative inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white transition hover:bg-brand-700 sm:px-4"
    >
      <ShoppingCart className="size-4" />
      <span className="hidden sm:inline">Заявка</span>
      {ready && count > 0 && (
        <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-navy-900 ring-2 ring-white">
          {count}
        </span>
      )}
    </Link>
  );
}
