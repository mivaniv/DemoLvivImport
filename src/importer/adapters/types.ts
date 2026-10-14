// Результат адаптера до перевірки: та сама структура, що й нормалізований JSON (format.ts).
// Товари лишаються «сирими» — їх поштучно перевіряє productSchema.
export type RawCatalog = {
  fullExport: boolean;
  categories: { id: string; name: string; parentId?: string; sortOrder?: number }[];
  products: unknown[];
};
