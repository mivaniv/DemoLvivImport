import type { Metadata } from "next";
import { Caveat, Manrope } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin", "cyrillic"],
});

// Домен для абсолютних адрес у метаданих (картинка прев'ю og:image тощо) — без шляху:
// basePath (GitHub Pages) Next додає до адрес сам. SITE_URL задає збірка (workflow).
const SITE_ORIGIN = new URL(process.env.SITE_URL || "https://lvivimport.com").origin;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "Lviv Import — європейські продукти для бізнесу",
    template: "%s — Lviv Import",
  },
  description:
    "B2B-портал імпорту європейських продуктів від перевірених брендів для роздрібної торгівлі, HoReCa та дистриб'юторів.",
  // Прев'ю посилань у месенджерах і соцмережах. Картинка — src/app/opengraph-image.jpg
  // (scripts/og-image/render.mjs); заголовок і опис беруться з <title> і description сторінки.
  openGraph: { type: "website", siteName: "Lviv Import", locale: "uk_UA" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk" className={`${manrope.variable} ${caveat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
