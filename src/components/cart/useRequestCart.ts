"use client";

import { useSyncExternalStore } from "react";
import { clampQty, parseRequestItems, REQUEST_MAX_LINES, type RequestItem } from "@/lib/request-cart";

// Кошик-заявка в localStorage. Спільний для всіх компонентів сторінки й синхронний між вкладками.
// Якщо сховище недоступне (приватний режим, заблоковано), кошик живе в пам'яті до перезавантаження.

const KEY = "lvivimport-cart-v1";
const EMPTY: RequestItem[] = [];
const listeners = new Set<() => void>();
let items: RequestItem[] | null = null;

function read(): RequestItem[] {
  if (items === null) {
    try {
      const raw = localStorage.getItem(KEY);
      items = raw ? parseRequestItems(JSON.parse(raw)) : [];
    } catch {
      items = [];
    }
  }
  return items;
}

function write(next: RequestItem[]) {
  items = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // лишається в пам'яті
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY && e.key !== null) return;
    items = null; // змінено в іншій вкладці — перечитуємо
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const noop = () => () => {};

export function useRequestCart() {
  const list = useSyncExternalStore(subscribe, read, () => EMPTY);
  // false під час серверного рендеру й гідратації: кошик ще не прочитано
  const ready = useSyncExternalStore(noop, () => true, () => false);
  return { items: list, ready, add, setQty, remove, clear };
}

function add(item: Omit<RequestItem, "qty">, qty?: number) {
  const list = read();
  const existing = list.find((i) => i.slug === item.slug);
  if (existing) return setQty(item.slug, existing.qty + (qty ?? 0));
  if (list.length >= REQUEST_MAX_LINES) return;
  write([...list, { ...item, qty: clampQty(item, qty ?? 0) }]);
}

function setQty(slug: string, qty: number) {
  write(read().map((i) => (i.slug === slug ? { ...i, qty: clampQty(i, qty) } : i)));
}

function remove(slug: string) {
  write(read().filter((i) => i.slug !== slug));
}

function clear() {
  write([]);
}
