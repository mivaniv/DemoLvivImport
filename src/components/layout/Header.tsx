import { ChevronDown, Menu, Search } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { NavLinks } from "@/components/layout/NavLinks";
import { RequestButton } from "@/components/layout/RequestButton";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:h-18 sm:px-6">
        <Logo className="h-10 sm:h-11" />

        <NavLinks className="ml-8 hidden items-center gap-8 text-sm font-medium lg:flex" />

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href="/catalog?focus=search"
            aria-label="Пошук товарів"
            className="grid size-10 place-items-center rounded-lg border border-line text-ink transition hover:border-brand-200 hover:text-brand-600"
          >
            <Search className="size-4" />
          </Link>
          <RequestButton />
          <span
            className="hidden h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold sm:inline-flex"
            title="Інші мови з'являться згодом"
          >
            UA <ChevronDown className="size-3.5 text-muted" />
          </span>

          <details className="group relative lg:hidden">
            <summary
              className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-line [&::-webkit-details-marker]:hidden"
              aria-label="Меню"
            >
              <Menu className="size-5" />
            </summary>
            <div className="absolute right-0 top-12 w-56 rounded-xl border border-line bg-white p-2 shadow-xl">
              <NavLinks className="flex flex-col" itemClassName="rounded-lg px-3 py-2.5 font-medium hover:bg-canvas" />
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
