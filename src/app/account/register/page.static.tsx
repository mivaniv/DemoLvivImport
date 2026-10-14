import type { Metadata } from "next";
import { StaticAccountNotice } from "@/components/account/StaticAccountNotice";

// Лише для статичної збірки (GitHub Pages) — див. pageExtensions у next.config.ts
export const metadata: Metadata = { title: "Стати клієнтом" };

export default function Page() {
  return <StaticAccountNotice title="Стати клієнтом" />;
}
