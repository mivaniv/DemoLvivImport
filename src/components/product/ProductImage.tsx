import Image from "next/image";
import { Package } from "lucide-react";

type Props = {
  src?: string | null;
  alt: string;
  sizes: string;
  preload?: boolean;
  className?: string;
};

// Фото товару або заглушка, якщо з 1С ще не прийшло зображення.
export function ProductImage({ src, alt, sizes, preload, className = "" }: Props) {
  if (!src) {
    return (
      <div className={`grid h-full w-full place-items-center text-brand-200 ${className}`}>
        <Package className="size-1/3" strokeWidth={1.2} />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      // SVG і зовнішні адреси віддаємо як є; локальні фото з 1С проходять оптимізацію next/image.
      unoptimized={src.endsWith(".svg") || /^https?:\/\//.test(src)}
      className={`object-contain ${className}`}
    />
  );
}
