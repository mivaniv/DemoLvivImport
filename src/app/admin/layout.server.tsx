import { AdminTabs } from "@/components/admin/AdminTabs";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";

// Адмінпанель: доступ лише користувачам з роллю ADMIN (вхід — через звичайну форму входу).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [pendingUsers, newOrders, newInquiries, pendingReviews] = await Promise.all([
    db.user.count({ where: { status: "PENDING" } }),
    db.order.count({ where: { status: "NEW" } }),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.review.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Адмінпанель</h1>
      </div>
      <AdminTabs counts={{ users: pendingUsers, orders: newOrders, inquiries: newInquiries, reviews: pendingReviews }} />
      {children}
    </div>
  );
}
