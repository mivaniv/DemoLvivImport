import { Boxes, CircleCheck, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyBox } from "@/components/product/BuyBox";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGallery } from "@/components/product/ProductGallery";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getProduct, getSimilarProducts } from "@/lib/catalog";

export async function generateMetadata(props: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) return { title: "Товар не знайдено" };
  return { title: product.name, description: product.description?.slice(0, 160) };
}

export default async function ProductPage(props: PageProps<"/product/[slug]">) {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const similar = await getSimilarProducts(product);

  const specs: [string, string][] = [
    ...(product.brand ? [["Бренд", product.brand.name] as [string, string]] : []),
    ["Назва", product.name],
    ...(product.netWeight ? [["Вага нетто", product.netWeight] as [string, string]] : []),
    ...(product.unitsPerBox ? [["Кількість у коробці", `${product.unitsPerBox} ${product.unit}`] as [string, string]] : []),
    ...product.attributes.map((a) => [a.name, a.value] as [string, string]),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Головна", href: "/" },
          { label: "Каталог", href: "/catalog" },
          ...(product.category ? [{ label: product.category.name, href: `/catalog?category=${product.category.slug}` }] : []),
          { label: product.name },
        ]}
      />

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:gap-8">
        <ProductGallery images={product.images} name={product.name} />

        <div className="h-fit rounded-2xl border border-line bg-white p-5 sm:p-7">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{product.name}</h1>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
            {product.brand && (
              <div className="flex gap-1">
                <dt>Бренд:</dt>
                <dd>
                  <Link href={`/catalog?brand=${product.brand.slug}`} className="font-semibold text-brand-600 hover:underline">
                    {product.brand.name}
                  </Link>
                </dd>
              </div>
            )}
            {product.sku && (
              <div className="flex gap-1">
                <dt>Артикул:</dt>
                <dd className="font-medium text-ink/80">{product.sku}</dd>
              </div>
            )}
          </dl>

          <div className="mt-5 flex flex-wrap gap-3 border-y border-line py-4 text-sm">
            {product.unitsPerBox && (
              <span className="inline-flex items-center gap-2 font-medium">
                <Boxes className="size-5 text-brand-600" strokeWidth={1.6} />
                {product.unitsPerBox} {product.unit} у коробці
              </span>
            )}
            <span className={`inline-flex items-center gap-2 font-medium ${product.inStock ? "text-emerald-700" : "text-amber-700"}`}>
              {product.inStock ? <CircleCheck className="size-5" strokeWidth={1.6} /> : <Clock className="size-5" strokeWidth={1.6} />}
              {product.inStock ? "В наявності" : "Під замовлення"}
            </span>
          </div>

          <div className="mt-5">
            <BuyBox
              unit={product.unit}
              item={{
                productId: product.id,
                slug: product.slug,
                name: product.name,
                image: product.images[0]?.url,
                unitsPerBox: product.unitsPerBox,
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-bold">Опис товару</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">
            {product.description || "Опис товару з'явиться незабаром."}
          </p>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold">Характеристики</h2>
          <dl className="overflow-hidden rounded-xl border border-line bg-white text-sm">
            {specs.map(([k, v], i) => (
              <div key={k} className={`grid grid-cols-2 gap-4 px-4 py-2.5 ${i % 2 ? "bg-white" : "bg-canvas/60"}`}>
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {similar.length > 0 && (
        <section className="mt-12">
          <SectionHeader
            title="Схожі товари"
            href={product.category ? `/catalog?category=${product.category.slug}` : "/catalog"}
            linkLabel="Переглянути всі"
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} variant="compact" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
