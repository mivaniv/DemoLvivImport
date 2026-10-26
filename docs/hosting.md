# Розміщення на хостингу HostPro (demo.lvivimport.com)

Схема роботи:

1. Зміни комітяться й пушаться в GitHub (гілка `main`).
2. GitHub Actions збирає сайт (workflow [deploy-hosting.yml](../.github/workflows/deploy-hosting.yml)).
3. **GitHub чекає вашого підтвердження.** Без нього на хостинг нічого не потрапляє.
4. Після підтвердження змінені файли заливаються по FTP у теку demo.lvivimport.com.

Зараз на хостинг іде **статична версія**: каталог без цін і входу, дані зі знімка `src/data/catalog-snapshot.json`. База даних і Node.js для неї не потрібні. Повну версію (база, кабінет, імпорт з 1С) підключимо окремим етапом.

## Налаштування — один раз

### 1. DirectAdmin HostPro: окремий FTP-акаунт для демосайту

> **Увага.** FTP-акаунт належить домену, у якому його створено. Акаунт `…@lvivimport.com` з коренем «Домен» відкривається в теці **lvivimport.com** (WordPress), а не демо. 26.10.2026 через це сайт залився в lvivimport.com.

1. У DirectAdmin угорі **оберіть домен `demo.lvivimport.com`**, потім **FTP Management → Створити FTP-акаунт**: логін, наприклад `deploy` (вийде `deploy@demo.lvivimport.com`), надійний пароль, коренева директорія **«Домен»**. Акаунт бачитиме лише `domains/demo.lvivimport.com`.
2. У файловому менеджері відкрийте `domains/demo.lvivimport.com/public_html/` і створіть **порожній файл `lvivimport-demo.txt`**. Це позначка: workflow заливає лише в теку, де вона є, і відмовляється, якщо в теці є WordPress/PHP (`wp-config.php`, `index.php`, `wp-admin`…).
3. Запишіть **FTP-сервер** (зазвичай `ftp.lvivimport.com` або ім'я сервера HostPro).
4. Переконайтесь, що для `demo.lvivimport.com` є SSL-сертифікат (Let's Encrypt у панелі).

### 2. GitHub: підтвердження перед заливкою

Репозиторій → **Settings → Environments → New environment** → назва `hosting`:

- **Required reviewers** — додайте себе (`mivaniv`) → *Save protection rules*;
- **Deployment branches and tags** → *Selected branches* → `main`.

### 3. GitHub: доступ до FTP

У тому ж Environment `hosting` → **Environment secrets → Add secret**:

| Секрет | Значення |
| --- | --- |
| `FTP_SERVER` | FTP-сервер з кроку 1.3 |
| `FTP_USERNAME` | логін FTP-акаунта повністю, напр. `deploy@demo.lvivimport.com` |
| `FTP_PASSWORD` | пароль FTP-акаунта |
| `FTP_DIR` | `/public_html/` (для акаунта з коренем «Домен» з кроку 1.1; починається й закінчується на `/`) |

Змінна `FTP_PROTOCOL` (Environment variables) — не задавайте (типово `ftps`); якщо FTPS не працює — `ftp`.

Перед заливкою workflow показує в журналі вміст цільової теки й зупиняється, якщо там немає `lvivimport-demo.txt` або є файли WordPress.

Паролі зберігаються лише в GitHub Secrets. У репозиторій і в чат вони не потрапляють.

### 4. GitHub: куди надходять заявки й форми

У тому ж Environment `hosting` (або Settings → Secrets and variables → Actions → **Variables**) → **Add variable**:

| Змінна | Значення |
| --- | --- |
| `FORM_TO_EMAIL` | адреса, на яку приходять заявки з кошика, «Замовити дзвінок», форма контактів і відгуки. Кілька адрес — через кому без пробілів |
| `FORM_FROM_EMAIL` | (необов'язково) адреса відправника, типово `noreply@demo.lvivimport.com` |

Без `FORM_TO_EMAIL` заливка зупиняється з поясненням. Адреса записується у `api/config.php` лише під час заливки: у репозиторій і в артефакт збірки вона не потрапляє.

## Як підтвердити заливку

1. Після кожного push у `main` у вкладці **Actions** з'являється запуск **«Deploy to hosting (demo.lvivimport.com)»**, і ви отримуєте лист від GitHub.
2. Відкрийте запуск → **Review deployments** → позначте `hosting` → **Approve and deploy**.
3. Через 1–2 хвилини зміни на https://demo.lvivimport.com.

Не хочете викладати? Натисніть **Reject**: сайт на хостингу лишиться попередній. Повторно викласти будь-яку версію можна через **Re-run jobs** у потрібному запуску.

## Що потрапляє на хостинг

- HTML-сторінки, стилі, скрипти, зображення з теки `out/`;
- [deploy/hosting/.htaccess](../deploy/hosting/.htaccess): сторінка 404, адреси без скісної риски на кінці, заборона індексації демосайту пошуковиками (`X-Robots-Tag: noindex`);
- [deploy/hosting/api/form.php](../deploy/hosting/api/form.php): обробник форм на PHP (Node.js на хостингу поки немає).
  - Перевіряє поля, приймає запити лише зі сторінок самого сайту, має приманку для ботів і обмеження частоти.
  - Надсилає лист функцією `mail()` хостингу.
  - Кожне звернення дописує в `api/data/submissions.log`. Тека `api/data/` і `api/config.php` закриті від відвідувачів ([api/.htaccess](../deploy/hosting/api/.htaccess)).

## Форми й кошик-заявка

- Кошик зберігається в браузері відвідувача (localStorage), ціни в ньому не показуються.
- Товари додаються прямо з каталогу кнопкою «У кошик».
- Кількість змінюється ящиками, а товари з позначкою «від 1 шт.» — штуками. Біля «+» є підказка, скільки буде після ще одного кроку.
- Кошик одночасно є формою заявки менеджеру: доставка, отримувач, телефон, компанія, email і коментар.

Якщо листи не приходять:
1. Перевірте «Спам».
2. Відкрийте `api/data/submissions.log` у файловому менеджері DirectAdmin. `"mailed":false` означає, що хостинг не відправив лист. Тоді в DirectAdmin → E-mail Accounts створіть скриньку `noreply@demo.lvivimport.com` або вкажіть у `FORM_FROM_EMAIL` наявну скриньку домену.

У повній версії (Node.js + база) ті самі форми працюють через серверні дії: заявки видно в `/admin/inquiries`.

Заливаються лише змінені файли. Інших файлів у теці (наприклад, залишених хостингом) workflow не видаляє.
