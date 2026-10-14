"use client";

import { useState } from "react";

// Вкладки «Опис» / «Характеристики», як на lvivimport.com
export function ProductTabs({ description, specs }: { description: string; specs: [string, string][] }) {
  const [tab, setTab] = useState<"desc" | "specs">("desc");
  const tabCls = (active: boolean) =>
    `h-11 rounded-t-xl px-5 text-sm font-semibold transition ${active ? "bg-white text-brand-600 shadow-[0_-1px_0_0] shadow-line" : "text-muted hover:text-ink"}`;

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-line">
        <button role="tab" aria-selected={tab === "desc"} onClick={() => setTab("desc")} className={tabCls(tab === "desc")}>
          Опис
        </button>
        <button role="tab" aria-selected={tab === "specs"} onClick={() => setTab("specs")} className={tabCls(tab === "specs")}>
          Характеристики
        </button>
      </div>
      <div className="rounded-b-2xl rounded-tr-2xl border border-t-0 border-line bg-white p-5 sm:p-7">
        {tab === "desc" ? (
          <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-ink/80">{description}</p>
        ) : (
          <dl className="overflow-hidden rounded-xl border border-line text-sm">
            {specs.map(([k, v], i) => (
              <div key={k} className={`grid grid-cols-2 gap-4 px-4 py-2.5 ${i % 2 ? "bg-white" : "bg-canvas/60"}`}>
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
