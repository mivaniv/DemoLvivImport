import type { NextConfig } from "next";

// Два режими збірки:
// - звичайний: Node.js-сервер + PostgreSQL (локально, VPS) — кабінет, ціни, кошик, адмінпанель;
// - статичний (NEXT_PUBLIC_STATIC_EXPORT=1): HTML-файли для GitHub Pages. Модулі, яким потрібна
//   база чи сервер, підміняються версіями *.static.ts(x) — дані з src/data/catalog-snapshot.json,
//   відвідувач завжди гість (без цін), форми пропонують зателефонувати.
const isStatic = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

const staticAliases = {
  "@/lib/catalog": "./src/lib/catalog.static.ts",
  "@/lib/reviews": "./src/lib/reviews.static.ts",
  "@/lib/auth/session": "./src/lib/auth/session.static.ts",
  "@/lib/header-data": "./src/lib/header-data.static.ts",
  "@/components/catalog/CatalogScreen": "./src/components/catalog/CatalogScreen.static.tsx",
  "@/app/actions/inquiry": "./src/app/actions/static.ts",
  "@/app/actions/review": "./src/app/actions/static.ts",
  "@/app/actions/cart": "./src/app/actions/static.ts",
  "@/app/actions/request": "./src/app/actions/static.ts",
};

const nextConfig: NextConfig = isStatic
  ? {
      output: "export",
      basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
      trailingSlash: true, // GitHub Pages віддає /catalog/ як /catalog/index.html
      images: { unoptimized: true },
      // page.static.tsx — замінники сторінок кабінету; *.server.ts(x) (кабінет, кошик, адмінпанель,
      // /media, прайс) до статичної збірки не входять.
      pageExtensions: ["static.tsx", "static.ts", "tsx", "ts"],
      turbopack: { resolveAlias: staticAliases },
      typescript: { tsconfigPath: "tsconfig.static.json" },
    }
  : {
      pageExtensions: ["tsx", "ts", "server.tsx", "server.ts"],
    };

export default nextConfig;
