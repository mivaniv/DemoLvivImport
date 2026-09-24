import { z } from "zod";

// Повідомлення про помилки валідації — українською, їх читає менеджер у журналі імпорту.
z.config(z.locales.uk());

// Нормалізований формат каталогу, який приймає імпортер.
// Коли надійде реальне вивантаження з 1С (XML/CommerceML, CSV чи JSON), адаптер
// перетворюватиме його саме в цю структуру — решта імпорту не зміниться.

export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  sortOrder: z.number().int().optional(),
});

export const productSchema = z.object({
  id: z.string().min(1), // унікальний ID товару в 1С
  sku: z.string().trim().optional(),
  name: z.string().trim().min(2),
  categoryId: z.string().optional(),
  brand: z.string().trim().optional(),
  description: z.string().optional(),
  netWeight: z.string().trim().optional(),
  unitsPerBox: z.number().int().positive().optional(),
  unit: z.string().trim().optional(),
  inStock: z.boolean().optional(),
  stockQty: z.number().int().min(0).optional(),
  popular: z.boolean().optional(),
  attributes: z.array(z.object({ name: z.string().min(1), value: z.string() })).optional(),
  // Шляхи відносно файлу вивантаження або абсолютні http(s)-адреси.
  // Відсутнє поле — фото не змінюються; порожній масив — фото видаляються.
  images: z.array(z.string().min(1)).optional(),
});

export const catalogFileSchema = z.object({
  generatedAt: z.string().optional(),
  // true — повне вивантаження: товари, яких немає у файлі, приховуються з сайту.
  fullExport: z.boolean().default(false),
  categories: z.array(categorySchema).default([]),
  // Товари перевіряються поштучно, щоб одна помилка не блокувала весь файл.
  products: z.array(z.unknown()),
});

export type ImportCategory = z.infer<typeof categorySchema>;
export type ImportProduct = z.infer<typeof productSchema>;
