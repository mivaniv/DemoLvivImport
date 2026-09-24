"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";

// Список заявки зберігається в localStorage відвідувача; на сервер потрапляє лише під час надсилання форми.

export type RequestItem = {
  productId: number;
  slug: string;
  name: string;
  image?: string;
  unitsPerBox?: number | null;
  quantity: number;
};

type RequestContextValue = {
  items: RequestItem[];
  count: number;
  ready: boolean;
  add: (item: Omit<RequestItem, "quantity">, quantity: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
};

const STORAGE_KEY = "lvivimport:request";
const EMPTY: RequestItem[] = [];

// --- зовнішнє сховище для useSyncExternalStore ---
let cache: RequestItem[] | null = null;
const listeners = new Set<() => void>();

function load(): RequestItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((i) => Number.isInteger(i?.productId) && i.quantity > 0) : [];
  } catch {
    return [];
  }
}

function read() {
  return (cache ??= load());
}

function write(next: RequestItem[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // приватний режим або заблоковане сховище — список живе до перезавантаження
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // зміни з інших вкладок
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const actions = {
  add(item: Omit<RequestItem, "quantity">, quantity: number) {
    const prev = read();
    const existing = prev.find((i) => i.productId === item.productId);
    write(
      existing
        ? prev.map((i) => (i.productId === item.productId ? { ...i, ...item, quantity: i.quantity + quantity } : i))
        : [...prev, { ...item, quantity }],
    );
  },
  setQuantity(productId: number, quantity: number) {
    write(read().map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, quantity) } : i)));
  },
  remove(productId: number) {
    write(read().filter((i) => i.productId !== productId));
  },
  clear() {
    write([]);
  },
};

const RequestContext = createContext<RequestContextValue | null>(null);

export function RequestProvider({ children }: { children: React.ReactNode }) {
  // На сервері й під час гідрації — порожній список, далі — дані з localStorage.
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);

  const value = useMemo(() => ({ items, count: items.length, ready, ...actions }), [items, ready]);

  return <RequestContext.Provider value={value}>{children}</RequestContext.Provider>;
}

export function useRequest() {
  const ctx = useContext(RequestContext);
  if (!ctx) throw new Error("useRequest must be used inside RequestProvider");
  return ctx;
}
