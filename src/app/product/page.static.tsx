import type { Metadata } from "next";
import { ProductScreen } from "@/components/product/ProductScreen";

// Лише для статичної збірки: один шаблон на всі товари (див. ProductScreen і deploy/hosting/.htaccess)
export const metadata: Metadata = { title: "Товар" };

export default function Page() {
  return <ProductScreen />;
}
