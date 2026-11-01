"use client";

import { useEffect, useState } from "react";
import { asset } from "@/lib/asset";
import type { CatalogData } from "@/lib/catalog-data";

// Свіжий каталог статичної версії з /data/products.json: на хостингу його щодня оновлює крон
// (deploy/hosting/api/update-catalog.php), тож каталог, головна й товари не чекають нової збірки.
// Файл завантажується один раз на сторінку; у повній версії (сервер + база) не завантажується.

const STATIC = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

let catalog: Promise<CatalogData> | undefined;

function loadCatalog() {
  // no-cache: браузер перепитує сервер (304, якщо файл не змінився), тож оновлення видно одразу
  catalog ??= fetch(asset("/data/products.json"), { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<CatalogData>;
  });
  catalog.catch(() => (catalog = undefined)); // наступна спроба — заново
  return catalog;
}

export type CatalogState = { data: CatalogData } | { error: true } | null;

export function useCatalogData(): CatalogState {
  const [state, setState] = useState<CatalogState>(null);
  useEffect(() => {
    if (!STATIC) return;
    let active = true;
    loadCatalog().then(
      (data) => active && setState({ data }),
      () => active && setState({ error: true }),
    );
    return () => {
      active = false;
    };
  }, []);
  return state;
}
