import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RequestForm } from "./RequestForm";

export const metadata: Metadata = { title: "Заявка" };

export default function RequestPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Головна", href: "/" }, { label: "Заявка" }]} />
      <h1 className="mb-6 mt-2 text-2xl font-bold sm:text-3xl">Заявка на ціни</h1>
      <RequestForm />
    </div>
  );
}
