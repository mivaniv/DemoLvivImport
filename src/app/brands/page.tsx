import type { Metadata } from "next";
import { BrandGrid } from "@/components/catalog/BrandGrid";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getBrands } from "@/lib/catalog";

export const metadata: Metadata = { title: "Бренди" };

export default async function BrandsPage() {
  const brands = await getBrands();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Головна", href: "/" }, { label: "Бренди" }]} />
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Бренди</h1>
      <p className="mt-2 max-w-2xl text-muted">Працюємо напряму з європейськими виробниками та офіційними постачальниками.</p>
      <BrandGrid brands={brands} />
    </div>
  );
}
