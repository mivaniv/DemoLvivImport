// Дрібні елементи адмінпанелі.

export function Card({ title, children, actions }: { title?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "amber" | "emerald" | "red" | "brand" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    brand: "bg-brand-50 text-brand-700",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function ActionButton({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "ghost" | "danger" }) {
  const tones = {
    brand: "bg-brand-600 text-white hover:bg-brand-700",
    ghost: "border border-line bg-white hover:border-brand-200",
    danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
  };
  return <button className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${tones[tone]}`}>{children}</button>;
}

export function FilterTabs({ current, options }: { current: string; options: { value: string; label: string; href: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <a
          key={o.value}
          href={o.href}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${o.value === current ? "bg-navy-800 text-white" : "bg-canvas text-muted hover:text-ink"}`}
        >
          {o.label}
        </a>
      ))}
    </div>
  );
}
