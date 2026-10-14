// Спільний формат відповіді серверних дій для форм (useActionState).
export type FormState =
  | { ok: true; message?: string }
  | { ok: false; message?: string; fieldErrors?: Partial<Record<string, string>>; values?: Record<string, string> }
  | null;

export function fieldErrorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) errors[String(issue.path[0])] ??= issue.message;
  return errors;
}

export function valuesOf(formData: FormData, fields: readonly string[]) {
  return Object.fromEntries(fields.map((f) => [f, String(formData.get(f) ?? "")]));
}

// Телефон: +380 67 123 45 67, 067 123-45-67 тощо
export const PHONE_RE = /^[+\d][\d\s()-]{8,19}$/;
