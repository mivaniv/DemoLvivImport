import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { FOOTER_INFO, FOOTER_PAGES } from "@/components/layout/nav";
import { SocialLinks } from "@/components/layout/SocialLinks";
import { COMPANY, HOURS, OFFICE, phoneHref, WAREHOUSE } from "@/content/company";
import { asset } from "@/lib/asset";

// Структура — як у підвалі lvivimport.com: сторінки, інформація, офіс, склад, соцмережі, графік.
export function Footer() {
  return (
    <footer className="mt-16 bg-navy-900 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div className="space-y-5">
          <div className="w-fit rounded-lg bg-white px-3 py-2">
            <Logo className="h-12" />
          </div>
          <p className="max-w-xs text-sm text-white/70">
            Провідна компанія — імпортер високоякісних продуктів харчування європейських виробників.
          </p>
          <a href={COMPANY.mapUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-sm text-white/80 hover:text-white">
            <MapPin className="mt-0.5 size-4 shrink-0" /> {COMPANY.address}
          </a>
          <SocialLinks className="text-white/80" />
        </div>

        <FooterColumn title="Сторінки" links={FOOTER_PAGES} />
        <FooterColumn title="Інформація" links={FOOTER_INFO} />

        <div className="space-y-5 text-sm">
          {[OFFICE, WAREHOUSE].map((c) => (
            <div key={c.title}>
              <p className="mb-2 font-semibold">{c.title}:</p>
              <a href={phoneHref(c.phone)} className="flex items-center gap-2 text-white/80 hover:text-white">
                <Phone className="size-4" /> {c.phone}
              </a>
              <a href={`mailto:${c.email}`} className="mt-1 flex items-center gap-2 text-white/80 hover:text-white">
                <Mail className="size-4" /> {c.email}
              </a>
            </div>
          ))}
          <div>
            <p className="mb-2 font-semibold">Графік роботи:</p>
            <ul className="space-y-1 text-white/80">
              {HOURS.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-white/50 sm:px-6">
          © ТОВ «Львівімпорт» {COMPANY.foundedYear}–{new Date().getFullYear()}. Всі права захищено.
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold">{title}:</p>
      <ul className="space-y-2 text-sm text-white/80">
        {links.map((l) => (
          <li key={l.href}>
            {l.href.endsWith(".xml") ? (
              <a href={asset(l.href)} className="hover:text-white">
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="hover:text-white">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
