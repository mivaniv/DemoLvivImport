import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { NAV } from "@/components/layout/nav";

// lucide-react 1.x не містить логотипів брендів, тому іконки соцмереж — власні спрощені SVG.
const SOCIALS = [
  {
    label: "LinkedIn",
    path: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.8v1.6h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1V21h-4v-4.9c0-1.17-.02-2.68-1.63-2.68-1.64 0-1.89 1.28-1.89 2.6V21h-4V9.75Z",
  },
  {
    label: "Instagram",
    path: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM12 2c-2.7 0-3.05 0-4.1.06-4.3.2-6.14 2.04-6.34 6.34C1.5 9.45 1.5 9.8 1.5 12s0 2.55.06 3.6c.2 4.3 2.04 6.14 6.34 6.34 1.05.06 1.4.06 4.1.06s3.05 0 4.1-.06c4.3-.2 6.14-2.04 6.34-6.34.06-1.05.06-1.4.06-3.6s0-2.55-.06-3.6c-.2-4.3-2.04-6.14-6.34-6.34C15.05 2 14.7 2 12 2Zm0 1.8c2.67 0 2.99 0 4.04.06 3.1.14 4.23 1.28 4.37 4.37.05 1.05.06 1.37.06 3.77s0 2.72-.06 3.77c-.14 3.09-1.27 4.23-4.37 4.37-1.05.05-1.37.06-4.04.06s-2.99 0-4.04-.06c-3.1-.14-4.23-1.28-4.37-4.37C3.54 14.72 3.53 14.4 3.53 12s0-2.72.06-3.77c.14-3.09 1.27-4.23 4.37-4.37C9.01 3.8 9.33 3.8 12 3.8Z",
  },
  {
    label: "Facebook",
    path: "M13.5 21v-7.5h2.6l.4-3.1h-3V8.5c0-.9.25-1.5 1.54-1.5h1.6V4.2c-.28-.04-1.23-.12-2.34-.12-2.32 0-3.9 1.41-3.9 4V10.4H7.8v3.1h2.6V21h3.1Z",
  },
  {
    label: "YouTube",
    path: "M21.6 7.2a2.5 2.5 0 0 0-1.77-1.77C18.27 5 12 5 12 5s-6.27 0-7.83.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.77 1.77C5.73 19 12 19 12 19s6.27 0 7.83-.43a2.5 2.5 0 0 0 1.77-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z",
  },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-navy-900 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:gap-10">
        <div className="w-fit rounded-lg bg-white px-3 py-2">
          <Logo className="h-9" />
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          {SOCIALS.map((s) => (
            <a key={s.label} href="#" aria-label={s.label} className="text-white/80 transition hover:text-white">
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
                <path d={s.path} />
              </svg>
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3 lg:ml-auto">
          <p className="text-sm leading-snug text-white/80">
            Разом розвиваємо
            <br />
            смаки України
          </p>
          <UkraineOutline className="h-10 w-auto text-white/70" />
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-white/50 sm:px-6">
          © {new Date().getFullYear()} Lviv Import. Демоверсія каталогу; фото упаковок ілюстративні.
        </p>
      </div>
    </footer>
  );
}

// Спрощений контур мапи України
function UkraineOutline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 30 L14 22 L24 24 L30 16 L42 18 L50 10 L62 14 L72 10 L84 16 L96 14 L104 22 L116 26 L112 38 L104 44 L98 42 L90 50 L78 50 L70 58 L60 56 L52 64 L44 60 L36 66 L30 58 L20 56 L14 48 L6 44 Z" />
    </svg>
  );
}
