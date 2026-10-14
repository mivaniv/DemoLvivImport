// Перемикач B2B-функцій: ціни, вхід клієнтів, реєстрація, кошик, замовлення, прайс.
// Поки кабінет не запущено (немає пошти, цін з 1С), сайт працює як каталог без цін:
// NEXT_PUBLIC_B2B_ENABLED не задано → вимкнено. Увімкнути: NEXT_PUBLIC_B2B_ENABLED="1" і перезапуск.
// NEXT_PUBLIC_ — бо перемикач потрібен і в браузері (статичний каталог на GitHub Pages).
export const B2B_ENABLED = process.env.NEXT_PUBLIC_B2B_ENABLED === "1";

// Заклик до співпраці: заявка на реєстрацію або, поки кабінету немає, — контакти
export const PARTNER_CTA = B2B_ENABLED
  ? { href: "/account/register", label: "Стати клієнтом" }
  : { href: "/contacts", label: "Зв'язатися з нами" };
