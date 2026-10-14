import { asset } from "@/lib/asset";

// Безперервна стрічка логотипів (як каруселі «Наші партнери» на lvivimport.com).
// Список дублюється, щоб прокрутка була без стику; при prefers-reduced-motion стрічка стоїть.
export function LogoMarquee({ logos }: { logos: { src: string; name: string }[] }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-4 pr-4" aria-hidden={hidden || undefined}>
      {logos.map((l) => (
        <li key={l.src} className="grid h-20 w-36 shrink-0 place-items-center rounded-xl bg-white px-4 ring-1 ring-line">
          {/* eslint-disable-next-line @next/next/no-img-element -- дрібні логотипи різних форматів (svg/png/jpg) */}
          <img src={asset(l.src)} alt={hidden ? "" : l.name} loading="lazy" className="max-h-12 max-w-full object-contain grayscale transition hover:grayscale-0" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
