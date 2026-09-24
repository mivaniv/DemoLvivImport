import Link from "next/link";
import { CardActions } from "@/components/product/CardActions";
import { ProductImage } from "@/components/product/ProductImage";
import type { ProductCardData } from "@/lib/catalog";

type Props = {
  product: ProductCardData;
  // compact — картка на головній і в «схожих»: без вибору кількості
  variant?: "full" | "compact" | "row";
};

export function ProductCard({ product, variant = "full" }: Props) {
  const href = `/product/${product.slug}`;
  const image = product.images[0];
  const requestItem = {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    image: image?.url,
    unitsPerBox: product.unitsPerBox,
  };

  const boxInfo = product.unitsPerBox ? (
    <span className="inline-flex rounded-md bg-canvas px-2 py-1 text-xs text-muted">
      {product.unitsPerBox} {product.unit} у коробці
    </span>
  ) : null;

  const stock = !product.inStock && (
    <span className="absolute left-3 top-3 z-10 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
      Під замовлення
    </span>
  );

  if (variant === "row") {
    return (
      <article className="flex gap-4 rounded-2xl border border-line bg-white p-4 transition hover:shadow-lg hover:shadow-brand-600/5 sm:gap-6">
        <Link href={href} className="relative block size-28 shrink-0 sm:size-36">
          {stock}
          <ProductImage src={image?.url} alt={image?.alt ?? product.name} sizes="144px" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <div className="min-w-0 flex-1 space-y-2">
            {product.brand && <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{product.brand.name}</p>}
            <Link href={href} className="block font-semibold leading-snug hover:text-brand-600">
              {product.name}
            </Link>
            {boxInfo}
          </div>
          <div className="sm:w-56">
            <CardActions item={requestItem} unit={product.unit} />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-line bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-600/5 sm:p-4">
      <Link href={href} className="relative mb-3 block aspect-square overflow-hidden rounded-xl">
        {stock}
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
      {variant === "full" ? (
        <>
          <div className="mt-2">{boxInfo}</div>
          <CardActions item={requestItem} unit={product.unit} />
        </>
      ) : (
        <>
          {product.unitsPerBox && (
            <p className="mt-1 text-xs text-muted">
              {product.unitsPerBox} {product.unit} у коробці
            </p>
          )}
          <div className="mt-auto pt-3">
            <Link
              href={href}
              className="flex h-9 items-center justify-center rounded-lg border border-brand-600 text-sm font-semibold text-brand-600 transition hover:bg-brand-600 hover:text-white"
            >
              Запитати ціну
            </Link>
          </div>
        </>
      )}
    </article>
  );
}
