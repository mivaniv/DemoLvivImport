# Lviv Import — демо B2B-каталогу

Next.js 16 + TypeScript + Tailwind CSS 4 + PostgreSQL 17 (Prisma 7). Дизайн — концепція «03 / Import Pro» ([docs/design/concept-03-import-pro.png](docs/design/concept-03-import-pro.png)).

## Запуск локально

Потрібні Node.js 20.9+, Docker Desktop.

```powershell
npm install                 # також генерує Prisma Client
copy .env.example .env      # задайте ADMIN_PASSWORD
npm run db:up               # PostgreSQL у Docker, порт 5433
npx prisma migrate deploy   # створює таблиці
npm run db:seed             # демоасортимент + SVG-ілюстрації упаковок
npm run dev                 # http://localhost:3000
```

## Сторінки

| Адреса | Що там |
| --- | --- |
| `/` | Головна: банер, категорії, популярні товари |
| `/catalog` | Пошук, категорії, бренди, наявність, сортування, сітка/список, пагінація. Стан фільтрів — в URL |
| `/product/[slug]` | Фото, кількість у штуках і коробках, характеристики, схожі товари |
| `/request` | Заявка на ціни: список зберігається в браузері, форма пише в таблицю `PriceRequest` |
| `/admin` | Стан імпорту, журнал помилок, останні заявки. HTTP Basic Auth (`ADMIN_USER` / `ADMIN_PASSWORD`) |

## Імпорт з 1С

```powershell
npm run import -- data/1c-sample/catalog.json
```

- Формат — нормалізований JSON, описаний у [src/importer/format.ts](src/importer/format.ts). Коли буде реальне вивантаження з 1С, додається адаптер, що перетворює його в цей формат.
- Ключ товару — `id` з 1С (`Product.externalId`); повторний імпорт оновлює, а не дублює.
- Поля, яких немає у файлі, не змінюються. `fullExport: true` приховує товари, відсутні у файлі.
- Некоректні товари пропускаються й потрапляють у журнал; якщо їх понад 20% — каталог не змінюється.
- Усі зміни — однією транзакцією: при помилці на сайті лишається попередній каталог.
- Одночасно може йти лише один імпорт (`pg_try_advisory_xact_lock`).
- Фото копіюються в `MEDIA_DIR` і віддаються за адресою `/media/...`.
- `data/1c-sample/catalog-broken.json` — приклад файлу, який імпорт відхиляє.

Щоденний запуск: Планувальник завдань Windows або `cron` на сервері з командою вище.

## Корисне

```powershell
npm run typecheck
npm run lint
npx prisma studio           # перегляд бази в браузері
```
