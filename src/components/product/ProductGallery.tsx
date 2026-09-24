"use client";

import { useState } from "react";
import { ProductImage } from "@/components/product/ProductImage";

export function ProductGallery({ images, name }: { images: { url: string; alt: string | null }[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-2 sm:flex-col">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Фото ${i + 1}`}
                aria-current={i === active}
                className={`relative block size-16 overflow-hidden rounded-xl border-2 bg-white transition sm:size-20 ${
                  i === active ? "border-brand-600" : "border-line hover:border-brand-200"
                }`}
              >
                <ProductImage src={img.url} alt="" sizes="80px" className="p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative aspect-square flex-1 overflow-hidden rounded-2xl border border-line bg-white">
        <ProductImage src={current?.url} alt={current?.alt ?? name} sizes="(min-width: 1024px) 560px, 90vw" preload className="p-6" />
      </div>
    </div>
  );
}
