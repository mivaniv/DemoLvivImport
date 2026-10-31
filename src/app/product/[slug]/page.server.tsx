import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetails } from "@/components/product/ProductDetails";
import { getViewer } from "@/lib/auth/session";
import { getAllProductSlugs, getProduct, getSimilarProducts } from "@/lib/catalog";

// Сторінка товару повної версії (рендерить сервер). На хостингу статична збірка обходиться одним
// шаблоном product/page.static.tsx; окремі сторінки товарів генерує лише збірка для GitHub Pages
// (page.pages.tsx, див. pageExtensions у next.config.ts).

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getAllProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) return { title: "Товар не знайдено" };
  return { title: product.name, description: product.description?.slice(0, 160) };
}

export default async function ProductPage(props: Props) {
  const { slug } = await props.params;
  const [product, viewer] = await Promise.all([getProduct(slug), getViewer()]);
  if (!product) notFound();
  const similar = await getSimilarProducts(product);
  return <ProductDetails product={product} similar={similar} viewer={viewer} />;
}
