import type { Metadata } from "next";
import { Caveat, Manrope } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { RequestProvider } from "@/components/request/RequestProvider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "Lviv Import — європейські продукти для бізнесу",
    template: "%s — Lviv Import",
  },
  description:
    "B2B-портал імпорту європейських продуктів від перевірених брендів для роздрібної торгівлі, HoReCa та дистриб'юторів.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk" className={`${manrope.variable} ${caveat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <RequestProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </RequestProvider>
      </body>
    </html>
  );
}
