import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/account/AuthForms";
import { AuthShell } from "@/components/account/AuthShell";
import type { SearchPageProps } from "@/lib/page-props";

export const metadata: Metadata = { title: "Новий пароль", robots: { index: false } };

export default async function ResetPasswordPage(props: SearchPageProps) {
  const { token } = await props.searchParams;
  return (
    <AuthShell title="Новий пароль">
      {typeof token === "string" && token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-sm">
          Посилання неповне.{" "}
          <Link href="/account/lost-password" className="font-medium text-brand-600 hover:underline">
            Запросіть нове
          </Link>
          .
        </p>
      )}
    </AuthShell>
  );
}
