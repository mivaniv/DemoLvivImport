import { z } from "zod";

// Спільна перевірка форми заявки для серверної (actions.ts) і статичної (actions.static.ts) версій.

const schema = z.object({
  company: z.string().trim().min(2, "Вкажіть назву компанії").max(200),
  contactName: z.string().trim().min(2, "Вкажіть контактну особу").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{8,19}$/, "Вкажіть телефон, наприклад +380 67 123 45 67"),
  email: z.union([z.literal(""), z.email("Некоректний email")]).optional(),
  comment: z.string().trim().max(2000).optional(),
  items: z
    .array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(100000) }))
    .min(1, "Додайте хоча б один товар")
    .max(200),
});

export type RequestFormState =
  // id: null — заявку сформовано листом у поштовій програмі (статична версія без сервера)
  | { ok: true; id: number | null }
  | { ok: false; message?: string; fieldErrors?: Partial<Record<string, string>>; values: Record<string, string> }
  | null;

const FIELDS = ["company", "contactName", "phone", "email", "comment"] as const;

export function parseRequestForm(formData: FormData) {
  // React скидає форму після дії — повертаємо введене, щоб не змушувати заповнювати заново.
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "")]));

  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    items = [];
  }

  const parsed = schema.safeParse({ ...values, items });
  if (parsed.success) return { ok: true as const, data: parsed.data, values };

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    fieldErrors[String(issue.path[0])] ??= issue.message;
  }
  return { ok: false as const, error: { ok: false as const, fieldErrors, values } };
}
