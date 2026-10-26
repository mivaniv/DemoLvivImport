import type { Metadata } from "next";
import { setInquiryStatus } from "@/app/actions/admin";
import { ActionButton, Card, FilterTabs, Pill } from "@/components/admin/ui";
import type { InquiryKind } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import type { SearchPageProps } from "@/lib/page-props";

export const metadata: Metadata = { title: "Звернення — адмінпанель", robots: { index: false } };

const KIND_LABELS: Record<InquiryKind, string> = { CALLBACK: "Замовлення дзвінка", CONTACT: "Повідомлення", REQUEST: "Заявка з кошика" };
const KIND_TONES: Record<InquiryKind, "brand" | "slate" | "emerald"> = { CALLBACK: "brand", CONTACT: "slate", REQUEST: "emerald" };

export default async function AdminInquiriesPage(props: SearchPageProps) {
  const { status: raw } = await props.searchParams;
  const status = raw === "DONE" ? "DONE" : "NEW";
  const items = await db.inquiry.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <Card
      title="Звернення: дзвінки та повідомлення"
      actions={
        <FilterTabs
          current={status}
          options={[
            { value: "NEW", label: "Нові", href: "/admin/inquiries" },
            { value: "DONE", label: "Опрацьовані", href: "/admin/inquiries?status=DONE" },
          ]}
        />
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted">Немає звернень.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-start justify-between gap-4 py-4 text-sm">
              <div className="space-y-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {i.name}
                  <Pill tone={KIND_TONES[i.kind]}>{KIND_LABELS[i.kind]}</Pill>
                  <span className="text-xs font-normal text-muted">{formatDateTime(i.createdAt)}</span>
                </p>
                <p>
                  {i.phone && <a href={`tel:${i.phone}`} className="text-brand-600">{i.phone}</a>}
                  {i.phone && i.email && " · "}
                  {i.email && <a href={`mailto:${i.email}`} className="text-brand-600">{i.email}</a>}
                  {(i.organization || i.position) && <span className="text-muted"> · {[i.organization, i.position].filter(Boolean).join(", ")}</span>}
                </p>
                {i.message && <p className="max-w-3xl whitespace-pre-line text-ink/80">{i.message}</p>}
                {i.page && <p className="text-xs text-muted">Сторінка: {i.page}</p>}
              </div>
              <form action={setInquiryStatus}>
                <input type="hidden" name="id" value={i.id} />
                <input type="hidden" name="status" value={status === "NEW" ? "DONE" : "NEW"} />
                <ActionButton tone={status === "NEW" ? "brand" : "ghost"}>{status === "NEW" ? "Опрацьовано" : "Повернути в нові"}</ActionButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
