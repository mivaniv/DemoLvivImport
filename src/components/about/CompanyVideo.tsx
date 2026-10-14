"use client";

import { useState } from "react";

// Відео з lvivimport.com. Файли великі (230–460 МБ), тому лежать на сервері компанії,
// а не в репозиторії, і завантажуються лише після натискання «Відтворити» (preload="none").
const VIDEO_BASE = "https://lvivimport.com/assets/images/video/";

export const LANGUAGE_VIDEOS = [
  { code: "UA", file: "LVIVIMPORT_Ukrainian.mp4" },
  { code: "EN", file: "Lvivimport_ENG+.mp4" },
  { code: "DE", file: "Lvivimport_DE+.mp4" },
  { code: "PL", file: "Lvivimport_PL+.mp4" },
  { code: "ES", file: "Lvivimport_ESP+.mp4" },
  { code: "PT", file: "Lvivimport_POR+.mp4" },
  { code: "IT", file: "Lvivimport_ITA.mp4" },
  { code: "FR", file: "Lvivimport_FR.mp4" },
];

const src = (file: string) => VIDEO_BASE + encodeURIComponent(file);

function Video({ file, poster, title }: { file: string; poster: string; title: string }) {
  return (
    <video
      key={file}
      controls
      preload="none"
      playsInline
      poster={poster}
      aria-label={title}
      className="aspect-video w-full rounded-2xl bg-navy-900 object-cover"
    >
      <source src={src(file)} type="video/mp4" />
    </video>
  );
}

// Презентація компанії з вибором мови (як на lvivimport.com: UA, EN, DE, PL, ES, PT, IT, FR)
export function LanguageVideo({ poster }: { poster: string }) {
  const [lang, setLang] = useState(LANGUAGE_VIDEOS[0]);
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Мова відео" className="flex flex-wrap gap-1.5">
        {LANGUAGE_VIDEOS.map((v) => (
          <button
            key={v.code}
            role="tab"
            aria-selected={v.code === lang.code}
            onClick={() => setLang(v)}
            className={`h-8 min-w-10 rounded-lg px-2.5 text-xs font-bold transition ${
              v.code === lang.code ? "bg-brand-600 text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink"
            }`}
          >
            {v.code}
          </button>
        ))}
      </div>
      <Video file={lang.file} poster={poster} title={`Відео про Львівімпорт (${lang.code})`} />
    </div>
  );
}

export function FleetVideo({ poster }: { poster: string }) {
  return <Video file="Lvivimport_TIR_finall.mp4" poster={poster} title="Автопарк Львівімпорт" />;
}
