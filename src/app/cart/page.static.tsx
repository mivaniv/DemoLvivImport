import type { Metadata } from "next";
import { RequestCartPage } from "@/components/cart/RequestCartPage";

// Лише для статичної збірки — див. pageExtensions у next.config.ts
export const metadata: Metadata = { title: "Кошик", robots: { index: false } };

export default function Page() {
  return <RequestCartPage />;
}
