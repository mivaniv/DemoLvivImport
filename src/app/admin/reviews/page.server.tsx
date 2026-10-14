import type { Metadata } from "next";
import { moderateReview } from "@/app/actions/admin";
import { Card, FilterTabs } from "@/components/admin/ui";
import { Stars } from "@/components/reviews/Stars";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import type { SearchPageProps } from "@/lib/page-props";

export const metadata: Metadata = { title: "Відгуки — адмінпанель", robots: { index: false } };

export default async function AdminReviewsPage(props: SearchPageProps) {
  const { status: raw } = await props.searchParams;
  const status = raw === "PUBLISHED" || raw === "REJECTED" ? raw : "PENDING";
  const reviews = await db.review.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <Card
      title="Відгуки"
      actions={
        <FilterTabs
          current={status}
          options={[
            { value: "PENDING", label: "На модерації", href: "/admin/reviews" },
            { value: "PUBLISHED", label: "Опубліковані", href: "/admin/reviews?status=PUBLISHED" },
            { value: "REJECTED", label: "Відхилені", href: "/admin/reviews?status=REJECTED" },
          ]}
        />
      }
    >
      {reviews.length === 0 ? (
        <p className="text-sm text-muted">Немає відгуків.</p>
      ) : (
        <ul className="divide-y divide-line">
          {reviews.map((r) => (
            <li key={r.id} className="grid gap-4 py-4 text-sm lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {r.author} <Stars rating={r.rating} /> <span className="text-xs font-normal text-muted">{formatDateTime(r.createdAt)}</span>
                </p>
                {r.email && <p className="text-xs text-muted">{r.email}</p>}
                <p className="whitespace-pre-line text-ink/85">{r.text}</p>
              </div>
              <form action={moderateReview} className="space-y-2">
                <input type="hidden" name="id" value={r.id} />
                <textarea
                  name="reply"
                  defaultValue={r.reply ?? ""}
                  rows={2}
                  placeholder="Відповідь Lvivimport (необов'язково)"
                  className="w-full rounded-lg border border-line px-3 py-2 text-xs"
                />
                <div className="flex flex-wrap gap-2">
                  <button name="status" value="PUBLISHED" className="h-8 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700">
                    {status === "PUBLISHED" ? "Зберегти відповідь" : "Опублікувати"}
                  </button>
                  {status !== "REJECTED" && (
                    <button name="status" value="REJECTED" className="h-8 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50">
                      {status === "PUBLISHED" ? "Зняти з публікації" : "Відхилити"}
                    </button>
                  )}
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
