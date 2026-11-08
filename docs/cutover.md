# Перехід lvivimport.com на новий сайт

Новий сайт (той, що зараз на demo.lvivimport.com) займає домен lvivimport.com замість WordPress.

- **Що зміниться:** на lvivimport.com відкривається новий каталог без цін; старі адреси ведуть на нові.
- **Що лишиться як було:** пошта `@lvivimport.com`, SSL, обмін з 1С (та сама тека й той самий FTP-акаунт), відео «Про нас».
- **WordPress не видаляється.** Він переїжджає в сусідню теку, а база лишається на місці. Повернення — одна команда, ~1 хвилина.

## Як це влаштовано

```
domains/lvivimport.com/
  public_html/             ← зараз WordPress; після перемикання — новий сайт
  public_html_new/         ← новий сайт, залитий заздалегідь (зникає після перемикання)
  public_html_wordpress/   ← після перемикання тут WordPress
```

Перемикання ([deploy/cutover/cutover.sh](../deploy/cutover/cutover.sh)) — дві зміни назв тек, кілька секунд. У новий сайт за тим самим шляхом переносяться дві теки:

- `assets/uploads/wpallimport/files/`
  - Сюди 1С щоночі заливає вивантаження й фото (FTP-акаунт `data@lvivimport.com`).
  - На новому сайті вона закрита від відвідувачів (`.htaccess`): файл з оптовими цінами більше не можна скачати.
- `assets/images/video/` — відео сторінки «Про нас»: сайт уже бере їх звідси.

**Старі адреси** ([api/legacy.php](../deploy/hosting/api/legacy.php), таблиця [api/legacy-urls.json](../deploy/hosting/api/legacy-urls.json)) — переадресація 301:

| Стара адреса | Куди |
| --- | --- |
| `/product/<адреса>/` | той самий товар (за кодом 1С). 842 з 1202 адрес не змінились, 359 ведуть на нову адресу, товари, яких більше немає, — у каталог |
| `/product-category/…/<категорія>/` | каталог з цією категорією (за UUID категорії в 1С) |
| `/en/…`, `/de/…`, `/pl/…`, `/cs/…`, `/fr/…`, `/it/…`, `/es/…`, `/pt-pt/…`, `/ru/…` | та сама сторінка українською |
| `/catalog/cart/`, `/catalog/checkout/` | `/cart/` |
| `/catalog/cart/payment-and-delivery/` | `/payment-and-delivery/` |
| `/catalog/exchange-and-return/` | `/exchange-and-return/` |
| `/home/`, `/team/`, `/shop/`, `/my-account/` | `/`, `/about/`, `/catalog/`, `/account/` |
| `/?s=…` | пошук у каталозі |

Таблицю будує `node scripts/legacy-urls-from-wp.mjs <копія-бази.sql.gz> <products.json>` з резервної копії бази WordPress. Переадресації працюють і на demo.lvivimport.com, тож їх можна перевірити заздалегідь.

## Підготовка (сайт lvivimport.com працює як зараз)

1. **FTP-акаунт для заливки** — `supclaude@lvivimport.com`, коренева тека `/home/zvszaqqj/domains/`.
   - WordPress теж у цій теці (`lvivimport.com/public_html`), але workflow туди не заливає: див. крок 4.
2. **Тека для нового сайту:** `domains/lvivimport.com/public_html_new/` і в ній порожній файл `lvivimport-site.txt` (створено 08.11.2026).
3. **GitHub → Settings → Environments → New environment `production`:**
   - Required reviewers — ви; Deployment branches — `main`;
   - секрети:
     - `FTP_SERVER` = `rocket-da8.hostsila.org` (як у середовищі `hosting`);
     - `FTP_USERNAME` = `supclaude@lvivimport.com`, `FTP_PASSWORD` — його пароль;
     - `FTP_DIR` = `/lvivimport.com/public_html_new/` (шлях від кореневої теки акаунта);
   - змінна `FORM_TO_EMAIL` (куди йдуть заявки, напр. `info@lvivimport.com`).
4. **Заливка:** Actions → **Deploy to hosting** → **Run workflow** → `target: production` → Approve.
   - Workflow заливає лише в теку з `lvivimport-site.txt` і без WordPress, тож у живий сайт він не потрапить.
5. **Каталог і фото в новій теці** (Термінал DirectAdmin, ~5 хвилин):
   ```
   php -q ~/domains/lvivimport.com/public_html_new/api/update-catalog.php --source=/home/zvszaqqj/public_html/assets/uploads/wpallimport/files
   ```
6. **Скрипт перемикання — на сервер:** [deploy/cutover/cutover.sh](../deploy/cutover/cutover.sh) у `~/wp-backup/`.
7. **Пробна перевірка:** `bash ~/wp-backup/cutover.sh check` — усі пункти мають бути з ✓.

## День переходу

Не з 05:00 до 06:00: тоді 1С заливає файли.

1. **Свіжа копія WordPress:** `bash ~/wp-backup/make-backup.sh` (~2 хв).
2. **Перемикання:** `bash ~/wp-backup/cutover.sh switch`.
   - Скрипт ще раз усе перевіряє й відмовляється, якщо щось не так.

### Після перемикання

3. **Крони** (DirectAdmin → Cron Jobs):
   - видалити 5 кронів WordPress: `create-backup.php` і чотири `wp-load.php?import_key=…`. Запишіть їх перед видаленням — вони знадобляться для повернення;
   - додати крон нового сайту:
     ```
     0 8 * * * php -q /home/zvszaqqj/domains/lvivimport.com/public_html/api/update-catalog.php --source=/home/zvszaqqj/public_html/assets/uploads/wpallimport/files
     ```
   - крон demo.lvivimport.com лишається.
4. **GitHub:** Environment `production` → секрет `FTP_DIR` = `/lvivimport.com/public_html/`.
5. **Перевірка:**
   - головна, каталог, сторінка товару з фото;
   - заявка з кошика доходить на `FORM_TO_EMAIL`;
   - стара адреса товару з іншим slug веде на товар;
   - `/en/contacts/` → `/contacts/`;
   - `https://lvivimport.com/assets/uploads/wpallimport/files/products_full.XML` → 403;
   - `robots.txt` і `sitemap.xml` — з адресами lvivimport.com.
6. **Google Search Console:** надіслати `https://lvivimport.com/sitemap.xml`.
7. **Наступного ранку:** `https://lvivimport.com/data/catalog-status.json` — `"ok": true`, дата файлу 1С свіжа.

### Якщо щось не так — повернення

1. `bash ~/wp-backup/cutover.sh rollback`.
2. Повернути 5 кронів WordPress, видалити крон нового сайту.
3. Секрет `FTP_DIR` — знову `/lvivimport.com/public_html_new/`.

## Потім

- **Через 2–4 тижні**, якщо все добре: видалити `public_html_wordpress` (~10 ГБ) і базу WordPress.
  - Перед цим — остання копія бази на ПК.
- **Тестова копія WordPress** (`public_html/staging`) переїжджає разом з WordPress. Окремий піддомен на неї, якщо є, після перемикання не працюватиме.
