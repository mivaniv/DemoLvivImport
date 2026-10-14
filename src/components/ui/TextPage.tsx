import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

// Рендер текстів, перенесених із lvivimport.com: «## » — підзаголовок, «• » — пункт списку, решта — абзаци.
type Block = { kind: "h"; text: string } | { kind: "p"; text: string } | { kind: "ul"; items: string[] };

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    if (line.startsWith("## ")) blocks.push({ kind: "h", text: line.slice(3) });
    else if (line.startsWith("• ")) {
      const last = blocks.at(-1);
      if (last?.kind === "ul") last.items.push(line.slice(2));
      else blocks.push({ kind: "ul", items: [line.slice(2)] });
    } else blocks.push({ kind: "p", text: line });
  }
  return blocks;
}

export function TextPage({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: "Головна", href: "/" }, { label: title }]} />
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1>
      {children}
      {text && (
        <div className="mt-6 space-y-4 rounded-2xl bg-white p-6 text-sm leading-relaxed text-ink/85 ring-1 ring-line sm:p-10">
          {parse(text).map((b, i) =>
            b.kind === "h" ? (
              <h2 key={i} className="pt-4 text-lg font-bold text-ink first:pt-0">{b.text}</h2>
            ) : b.kind === "ul" ? (
              <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-brand-600">
                {b.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            ) : (
              <p key={i}>{b.text}</p>
            ),
          )}
        </div>
      )}
    </div>
  );
}
