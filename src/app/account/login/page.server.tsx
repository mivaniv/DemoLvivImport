import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/account/AuthForms";
import { AuthShell } from "@/components/account/AuthShell";
import { getViewer } from "@/lib/auth/session";
import { PARTNER_CTA } from "@/lib/features";
import type { SearchPageProps } from "@/lib/page-props";

export const metadata: Metadata = { title: "Вхід", robots: { index: false } };

export default async function LoginPage(props: SearchPageProps) {
  const { next } = await props.searchParams;
  if (await getViewer()) redirect(typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/account");

  return (
    <AuthShell
      title="Вхід"
      subtitle="Перегляд цін та можливість замовлення доступні лише зареєстрованим користувачам."
      aside={
        <div className="border-t border-white/15 pt-5">
          <p className="text-sm text-white/80">Ще не співпрацюєте з нами?</p>
          <Link href={PARTNER_CTA.href} className="mt-3 inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold hover:bg-brand-500">
            {PARTNER_CTA.label}
          </Link>
        </div>
      }
    >
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </AuthShell>
  );
}
