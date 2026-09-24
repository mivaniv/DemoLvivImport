import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold">Сторінку не знайдено</h1>
      <p className="mt-2 text-muted">Можливо, товар більше не постачається або посилання застаріло.</p>
      <Link href="/catalog" className="mt-8 inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white">
        До каталогу
      </Link>
    </div>
  );
}
