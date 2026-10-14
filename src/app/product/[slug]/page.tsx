import { Boxes, CircleCheck, Clock, FileSpreadsheet, Lock, PackageCheck, Phone, ShieldCheck, Truck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CallbackButton } from "@/components/layout/CallbackDialog";
import { AddToCart } from "@/components/product/AddToCart";
import { Badges } from "@/components/product/Badges";
import { GUEST_PRICE_NOTICE, PriceTag } from "@/components/product/PriceTag";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductTabs } from "@/components/product/ProductTabs";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MAIN_PHONE, PRODUCT_PERKS } from "@/content/company";
import { getViewer } from "@/lib/auth/session";
import { getAllProductSlugs, getProduct, getSimilarProducts } from "@/lib/catalog";
import { B2B_ENABLED } from "@/lib/features";

export async function generateStaticParams() {
  return (await getAllProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) return { title: "Товар не знайдено" };
  return { title: product.name, description: product.description?.slice(0, 160) };
}

const PERK_ICONS = [Truck, Wallet, ShieldCheck];

export default async function ProductPage(props: PageProps<"/product/[slug]">) {
  const { slug } = await props.params;
  const [product, viewer] = await Promise.all([getProduct(slug), getViewer()]);
  if (!product) notFound();
  const canOrder = viewer?.canOrder ?? false;

  const similar = await getSimilarProducts(product);

  const specs: [string, string][] = [
    ...(product.brand ? [["Бренд", product.brand.name] as [string, string]] : []),
    ...(product.sku ? [["Артикул", product.sku] as [string, string]] : []),
    ...(product.barcode ? [["Штрихкод", product.barcode] as [string, string]] : []),
    ...(product.netWeight ? [["Вага нетто", product.netWeight] as [string, string]] : []),
    ...(product.unitsPerBox ? [["Кількість у ящику", `${product.unitsPerBox} ${product.unit}`] as [string, string]] : []),
    ["Мінімальне замовлення", `від ${product.minOrder} ${product.unit}`],
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
        <div className="relative">
          <Badges isPopular={product.isPopular} isNew={product.isNew} isSale={product.isSale} className="absolute right-3 top-3 z-10" />
          <ProductGallery images={product.images} name={product.name} />
        </div>

        <div className="h-fit space-y-5 rounded-2xl border border-line bg-white p-5 sm:p-7">
          <div>
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
              {product.barcode && (
                <div className="flex gap-1">
                  <dt>Штрихкод:</dt>
                  <dd className="font-medium text-ink/80">{product.barcode}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 border-y border-line py-4 text-sm">
            <span className="inline-flex items-center gap-2 font-medium">
              <PackageCheck className="size-5 text-brand-600" strokeWidth={1.6} /> Від {product.minOrder} шт
            </span>
            {product.unitsPerBox && (
              <span className="inline-flex items-center gap-2 font-medium">
                <Boxes className="size-5 text-brand-600" strokeWidth={1.6} />
                {product.unitsPerBox} {product.unit} у ящику
              </span>
            )}
            <span className={`inline-flex items-center gap-2 font-medium ${product.inStock ? "text-emerald-700" : "text-amber-700"}`}>
              {product.inStock ? <CircleCheck className="size-5" strokeWidth={1.6} /> : <Clock className="size-5" strokeWidth={1.6} />}
              {product.inStock ? "В наявності" : "Під замовлення"}
            </span>
          </div>

          {canOrder ? (
            <div className="space-y-5">
              <PriceTag canOrder price={product.price} oldPrice={product.oldPrice} unit={product.unit} unitsPerBox={product.unitsPerBox} size="lg" />
              {B2B_ENABLED && product.price !== null && (
                <AddToCart productId={product.id} unit={product.unit} minOrder={product.minOrder} unitsPerBox={product.unitsPerBox} />
              )}
            </div>
          ) : !B2B_ENABLED ? (
            // Каталог без цін: замість входу — зв'язок з менеджером
            <div className="space-y-3 rounded-xl bg-brand-50 p-4">
              <p className="text-sm font-medium text-navy-800">Ціни та умови поставки — у менеджера:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <a href={MAIN_PHONE.href} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700">
                  <Phone className="size-4" /> {MAIN_PHONE.label}
                </a>
                <CallbackButton
                  label="Отримати консультацію"
                  topic={product.name}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-600 bg-white text-sm font-semibold text-brand-600 hover:bg-brand-50"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl bg-brand-50 p-4">
              <p className="flex gap-2 text-sm font-medium text-navy-800">
                <Lock className="mt-0.5 size-4 shrink-0 text-brand-600" />
                {viewer ? "Ваш акаунт очікує підтвердження менеджером — після цього відкриються ціни й замовлення." : GUEST_PRICE_NOTICE}
              </p>
              {!viewer && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link href={`/account/login?next=/product/${product.slug}`} className="flex h-11 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700">
                    Увійти
                  </Link>
                  <Link href="/account/register" className="flex h-11 items-center justify-center rounded-xl border border-brand-600 bg-white text-sm font-semibold text-brand-600 hover:bg-brand-50">
                    Стати клієнтом
                  </Link>
                </div>
              )}
            </div>
          )}

          {B2B_ENABLED && (
          <div className="grid gap-2 sm:grid-cols-2">
            {canOrder ? (
              <a href="/price-list" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold hover:border-brand-200 hover:text-brand-600">
                <FileSpreadsheet className="size-4" /> Завантажити прайс
              </a>
            ) : (
              <Link href="/account/login?next=/price-list" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold hover:border-brand-200 hover:text-brand-600">
                <FileSpreadsheet className="size-4" /> Завантажити прайс
              </Link>
            )}
            <CallbackButton
              label="Отримати консультацію"
              topic={product.name}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold hover:border-brand-200 hover:text-brand-600"
            />
          </div>
          )}

          <ul className="grid gap-3 border-t border-line pt-4 text-xs font-medium text-muted sm:grid-cols-3">
            {PRODUCT_PERKS.map((perk, i) => {
              const Icon = PERK_ICONS[i];
              return (
                <li key={perk} className="flex items-center gap-2">
                  <Icon className="size-5 shrink-0 text-brand-600" strokeWidth={1.6} /> {perk}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <section className="mt-10" aria-label="Усе про товар">
        <h2 className="mb-4 text-lg font-bold">Усе про товар</h2>
        <ProductTabs
          description={product.description || "Опис товару з'явиться незабаром."}
          specs={specs}
        />
      </section>

      {similar.length > 0 && (
        <section className="mt-12">
          <SectionHeader
            title="Схожі позиції"
            href={product.category ? `/catalog?category=${product.category.slug}` : "/catalog"}
            linkLabel="Переглянути всі"
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} variant="compact" canOrder={canOrder} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
