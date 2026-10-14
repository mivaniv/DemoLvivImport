const money = new Intl.NumberFormat("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// 1234.5 → «1 234,50 ₴»
export function formatPrice(value: number): string {
  return `${money.format(value)} ₴`;
}

const date = new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Kyiv" });
const dateTime = new Intl.DateTimeFormat("uk-UA", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Kyiv" });

export const formatDate = (d: Date) => date.format(d);
export const formatDateTime = (d: Date) => dateTime.format(d);

// Номер замовлення для людей: № 000123
export const orderNumber = (id: number) => `№ ${String(id).padStart(6, "0")}`;

// Українські відмінки: plural(5, ["товар", "товари", "товарів"]) → «товарів»
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
