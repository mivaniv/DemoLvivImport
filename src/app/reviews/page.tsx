import type { Metadata } from "next";
import Link from "next/link";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { Stars } from "@/components/reviews/Stars";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { formatDate, plural } from "@/lib/format";
import { getReviewsPage, reviewsPageNumber } from "@/lib/reviews";

export const metadata: Metadata = { title: "Відгуки" };

export default async function ReviewsPage(props: PageProps<"/reviews">) {
  const page = await reviewsPageNumber(props.searchParams);
  const data = await getReviewsPage(page);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Головна", href: "/" }, { label: "Відгуки" }]} />
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Відгуки</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="h-fit space-y-4 rounded-2xl bg-white p-6 ring-1 ring-line lg:sticky lg:top-36">
          <p className="text-5xl font-extrabold">{data.average.toLocaleString("uk-UA")}</p>
          <Stars rating={data.average} className="size-5" />
          <p className="text-sm text-muted">
            Оцінка {data.average.toLocaleString("uk-UA")} з 5 на основі {data.total} {plural(data.total, ["відгуку", "відгуків", "відгуків"])}
          </p>
          <ul className="space-y-1.5">
            {data.distribution.map((d) => (
              <li key={d.stars} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-right">{d.stars}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                  <span className="block h-full rounded-full bg-gold" style={{ width: `${data.total ? (d.count / data.total) * 100 : 0}%` }} />
                </span>
                <span className="w-8 text-right text-muted">{data.total ? Math.round((d.count / data.total) * 100) : 0}%</span>
              </li>
            ))}
          </ul>
          <a href="#leave-review" className="flex h-11 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700">
            Залишити відгук
          </a>
        </aside>

        <div className="space-y-4">
          <h2 className="text-lg font-bold">Останні відгуки</h2>
          {data.items.map((r) => (
            <article key={r.id} className="rounded-2xl bg-white p-6 ring-1 ring-line">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{r.author}</p>
                <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
              </div>
              <Stars rating={r.rating} />
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/85">{r.text}</p>
              {r.reply && (
                <div className="mt-4 rounded-xl border-l-4 border-brand-600 bg-brand-50 px-4 py-3 text-sm">
                  <p className="font-semibold text-navy-800">Відповідь Lvivimport</p>
                  <p className="mt-1 text-ink/80">{r.reply}</p>
                </div>
              )}
            </article>
          ))}

          {data.pages > 1 && (
            <nav aria-label="Сторінки відгуків" className="flex gap-1.5">
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={n === 1 ? "/reviews" : `/reviews?page=${n}`}
                  aria-current={n === page ? "page" : undefined}
                  className={`grid size-9 place-items-center rounded-lg border text-sm font-semibold ${n === page ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white"}`}
                >
                  {n}
                </Link>
              ))}
            </nav>
          )}

          <section id="leave-review" className="scroll-mt-36 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
            <h2 className="text-lg font-bold">Залишити відгук</h2>
            <p className="mb-5 mt-1 text-sm text-muted">Відгук з&apos;явиться на сайті після перевірки модератором.</p>
            <ReviewForm />
          </section>
        </div>
      </div>
    </div>
  );
}
