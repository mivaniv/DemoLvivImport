import { ChevronDown, Clock, Menu, Phone, Search, ShoppingCart, UserRound } from "lucide-react";
import Link from "next/link";
import { CallbackButton } from "@/components/layout/CallbackDialog";
import { Logo } from "@/components/layout/Logo";
import { NavLinks } from "@/components/layout/NavLinks";
import { SocialLinks } from "@/components/layout/SocialLinks";
import { HOURS, MAIN_PHONE } from "@/content/company";
import { getViewer } from "@/lib/auth/session";
import { B2B_ENABLED } from "@/lib/features";
import { getHeaderCartCount } from "@/lib/header-data";

export async function Header() {
  const viewer = await getViewer();
  const cartCount = B2B_ENABLED && viewer?.canOrder ? await getHeaderCartCount(viewer.id) : 0;

  return (
    <header className="sticky top-0 z-40">
      {/* Верхня смуга: телефон, графік, дзвінок — як на lvivimport.com */}
      <div className="bg-navy-900 text-white">
        <div className="mx-auto flex h-10 max-w-7xl items-center gap-5 px-4 text-xs sm:px-6">
          <a href={MAIN_PHONE.href} className="inline-flex items-center gap-1.5 font-semibold hover:text-brand-200">
            <Phone className="size-3.5" /> {MAIN_PHONE.label}
          </a>
          <span className="hidden items-center gap-1.5 text-white/70 md:inline-flex">
            <Clock className="size-3.5" /> {HOURS[0]} · {HOURS[1]}
          </span>
          <SocialLinks className="ml-auto hidden text-white/70 sm:flex" iconClass="size-4" />
          <CallbackButton className="ml-auto inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide text-gold hover:text-white sm:ml-0" />
        </div>
      </div>

      <div className="border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:h-18 sm:px-6">
          <Logo className="h-10 sm:h-11" />

          <NavLinks className="ml-6 hidden items-center gap-7 text-sm font-medium lg:flex" />

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/catalog?focus=search"
              aria-label="Пошук товарів"
              className="grid size-10 place-items-center rounded-lg border border-line text-ink transition hover:border-brand-200 hover:text-brand-600"
            >
              <Search className="size-4" />
            </Link>

            {/* Поки B2B вимкнено, вхід не рекламуємо; адміністратор заходить за прямим посиланням /account/login */}
            {(B2B_ENABLED || viewer) && (
              <Link
                href={viewer?.role === "ADMIN" && !B2B_ENABLED ? "/admin" : "/account"}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium transition hover:border-brand-200 hover:text-brand-600"
                aria-label={viewer ? "Особистий кабінет" : "Увійти"}
              >
                <UserRound className="size-4" />
                <span className="hidden max-w-36 truncate md:inline">{viewer ? viewer.company : "Увійти"}</span>
              </Link>
            )}

            {B2B_ENABLED && viewer?.canOrder && (
              <Link
                href="/cart"
                className="relative inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white transition hover:bg-brand-700 sm:px-4"
              >
                <ShoppingCart className="size-4" />
                <span className="hidden sm:inline">Кошик</span>
                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-navy-900 ring-2 ring-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            <span className="hidden h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold sm:inline-flex" title="Інші мови з'являться згодом">
              UA <ChevronDown className="size-3.5 text-muted" />
            </span>

            <details className="group relative lg:hidden">
              <summary
                className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-line [&::-webkit-details-marker]:hidden"
                aria-label="Меню"
              >
                <Menu className="size-5" />
              </summary>
              <div className="absolute right-0 top-12 w-60 rounded-xl border border-line bg-white p-2 shadow-xl">
                <NavLinks className="flex flex-col" itemClassName="rounded-lg px-3 py-2.5 font-medium hover:bg-canvas" withExtras />
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
