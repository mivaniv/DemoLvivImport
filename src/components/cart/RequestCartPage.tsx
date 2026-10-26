import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RequestCart } from "./RequestCart";

// Сторінка кошика-заявки (каталог без цін) — спільна для статичної й серверної збірки
export function RequestCartPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Головна", href: "/" }, { label: "Кошик" }]} />
      <h1 className="mb-6 mt-2 text-2xl font-bold sm:text-3xl">Кошик</h1>
      <RequestCart />
    </div>
  );
}
