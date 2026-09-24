import type { NextConfig } from "next";

// Два режими збірки:
// - звичайний: Node.js-сервер + PostgreSQL (локально, VPS);
// - статичний (NEXT_PUBLIC_STATIC_EXPORT=1): HTML-файли для GitHub Pages. Модулі, яким потрібна
//   база, підміняються версіями *.static.ts, що читають знімок каталогу src/data/catalog-snapshot.json.
const isStatic = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

const staticAliases = {
  "@/lib/catalog": "./src/lib/catalog.static.ts",
  "@/components/catalog/CatalogScreen": "./src/components/catalog/CatalogScreen.static.tsx",
  "@/app/request/actions": "./src/app/request/actions.static.ts",
};

const nextConfig: NextConfig = isStatic
  ? {
      output: "export",
      basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
      trailingSlash: true, // GitHub Pages віддає /catalog/ як /catalog/index.html
      images: { unoptimized: true },
      // *.server.ts(x) — адмінпанель, /media, proxy: потребують сервера, у статичну збірку не входять
      pageExtensions: ["tsx", "ts"],
      turbopack: { resolveAlias: staticAliases },
    }
  : {
      pageExtensions: ["tsx", "ts", "server.tsx", "server.ts"],
    };

export default nextConfig;
