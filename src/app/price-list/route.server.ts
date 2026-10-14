import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/mail";

// «Завантажити прайс»: CSV для Excel (UTF-8 з BOM, роздільник «;»), лише для підтверджених клієнтів.
export async function GET() {
  const viewer = await getViewer();
  if (!viewer?.canOrder) return NextResponse.redirect(siteUrl("/account/login?next=/price-list"));

  const products = await db.product.findMany({
    where: { isActive: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: {
      sku: true, barcode: true, name: true, netWeight: true, unitsPerBox: true, unit: true, minOrder: true, price: true, inStock: true,
      brand: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [
    ["Категорія", "Артикул", "Штрихкод", "Назва", "Бренд", "Вага/об'єм", "Шт. у ящику", "Мін. замовлення", "Ціна, грн", "Наявність"],
    ...products.map((p) => [
      p.category?.name, p.sku, p.barcode, p.name, p.brand?.name, p.netWeight, p.unitsPerBox, p.minOrder,
      p.price === null ? "" : Number(p.price).toFixed(2).replace(".", ","),
      p.inStock ? "в наявності" : "під замовлення",
    ]),
  ];
  const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lvivimport-price-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
