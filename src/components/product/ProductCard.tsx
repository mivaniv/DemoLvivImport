import Link from "next/link";
import { AddToCart } from "@/components/product/AddToCart";
import { Badges } from "@/components/product/Badges";
import { PriceTag } from "@/components/product/PriceTag";
import { ProductImage } from "@/components/product/ProductImage";
import type { ProductCardData } from "@/lib/catalog";
import { B2B_ENABLED } from "@/lib/features";

type Props = {
  product: ProductCardData;
  // compact — без вибору кількості (головна, «схожі позиції»)
  variant?: "full" | "compact" | "row";
  // підтверджений клієнт: бачить ціни й може замовляти
  canOrder?: boolean;
};

export function ProductCard({ product, variant = "full", canOrder = false }: Props) {
  const href = `/product/${product.slug}`;
  const image = product.images[0];

  const meta = (
    <div className="flex flex-wrap gap-1.5 text-xs">
      <span className="rounded-md bg-brand-50 px-2 py-1 font-medium text-brand-700">Від {product.minOrder} шт</span>
      {product.unitsPerBox ? <span className="rounded-md bg-canvas px-2 py-1 text-muted">{product.unitsPerBox} шт./ящ.</span> : null}
      {!product.inStock && <span className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700">Під замовлення</span>}
    </div>
  );

  const order = B2B_ENABLED && canOrder && product.price !== null && variant !== "compact" && (
    <AddToCart productId={product.id} unit={product.unit} minOrder={product.minOrder} unitsPerBox={product.unitsPerBox} compact />
  );

  if (variant === "row") {
    return (
      <article className="flex gap-4 rounded-2xl border border-line bg-white p-4 transition hover:shadow-lg hover:shadow-brand-600/5 sm:gap-6">
        <Link href={href} className="relative block size-28 shrink-0 sm:size-36">
          <Badges isPopular={product.isPopular} isNew={product.isNew} isSale={product.isSale} className="absolute left-0 top-0 z-10" />
          <ProductImage src={image?.url} alt={image?.alt ?? product.name} sizes="144px" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="min-w-0 flex-1 space-y-2">
            {product.brand && <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{product.brand.name}</p>}
            <Link href={href} className="block font-semibold leading-snug hover:text-brand-600">
              {product.name}
            </Link>
            {meta}
          </div>
          <div className="space-y-3 sm:w-60">
            <PriceTag canOrder={canOrder} price={product.price} oldPrice={product.oldPrice} unit={product.unit} unitsPerBox={product.unitsPerBox} />
            {order}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-line bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-600/5 sm:p-4">
      <Link href={href} className="relative mb-3 block aspect-square overflow-hidden rounded-xl">
        <Badges isPopular={product.isPopular} isNew={product.isNew} isSale={product.isSale} className="absolute left-2 top-2 z-10" />
        <ProductImage
          src={image?.url}
          alt={image?.alt ?? product.name}
          sizes="(min-width: 1280px) 260px, (min-width: 768px) 30vw, 45vw"
          className="transition duration-300 group-hover:scale-[1.03]"
        />
      </Link>
      <Link href={href} className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug hover:text-brand-600">
        {product.name}
      </Link>
      <div className="mt-2">{meta}</div>
      <div className="mt-auto space-y-3 pt-3">
        <PriceTag canOrder={canOrder} price={product.price} oldPrice={product.oldPrice} unit={product.unit} />
        {order}
      </div>
    </article>
  );
}
