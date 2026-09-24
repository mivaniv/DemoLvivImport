import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function SectionHeader({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
          {linkLabel} <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
