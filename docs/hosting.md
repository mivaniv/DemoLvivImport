# Розміщення на хостингу HostPro (demo.lvivimport.com)

Схема роботи:

1. Зміни комітяться й пушаться в GitHub (гілка `main`).
2. GitHub Actions збирає сайт (workflow [deploy-hosting.yml](../.github/workflows/deploy-hosting.yml)).
3. **GitHub чекає вашого підтвердження.** Без нього на хостинг нічого не потрапляє.
4. Після підтвердження змінені файли заливаються по FTP у теку demo.lvivimport.com.

Зараз на хостинг іде **статична версія**: каталог без цін і входу, дані зі знімка `src/data/catalog-snapshot.json`. База даних і Node.js для неї не потрібні. Повну версію (база, кабінет, імпорт з 1С) підключимо окремим етапом.

## Налаштування — один раз

### 1. cPanel HostPro: окремий FTP-акаунт для демосайту

1. **Домени → Піддомени**: перевірте, що `demo.lvivimport.com` існує, і запишіть його **кореневу теку** (наприклад, `demo.lvivimport.com` або `public_html/demo`).
2. **FTP-акаунти → Додати**: логін, наприклад `deploy`, надійний пароль. У полі **Directory** вкажіть кореневу теку демосайту з кроку 1.
   Такий акаунт бачить лише цю теку й не може зачепити файли WordPress lvivimport.com.
3. Запишіть **FTP-сервер** (у «Налаштування FTP-клієнта» біля акаунта, зазвичай `ftp.lvivimport.com` або ім'я сервера HostPro).
4. **SSL/TLS Status** (AutoSSL): переконайтесь, що для `demo.lvivimport.com` є сертифікат.

### 2. GitHub: підтвердження перед заливкою

Репозиторій → **Settings → Environments → New environment** → назва `hosting`:

- **Required reviewers** — додайте себе (`mivaniv`) → *Save protection rules*;
- **Deployment branches and tags** → *Selected branches* → `main`.

### 3. GitHub: доступ до FTP

У тому ж Environment `hosting` → **Environment secrets → Add secret**:

| Секрет | Значення |
| --- | --- |
| `FTP_SERVER` | FTP-сервер з кроку 1.3 |
| `FTP_USERNAME` | логін FTP-акаунта (повний, як у cPanel, напр. `deploy@lvivimport.com`) |
| `FTP_PASSWORD` | пароль FTP-акаунта |
| `FTP_DIR` | `/` для окремого акаунта з кроку 1.2 (обов'язково закінчується на `/`) |

**Environment variables → Add variable**:

| Змінна | Значення |
| --- | --- |
| `FTP_DEDICATED_ACCOUNT` | `true` — підтверджує, що акаунт бачить лише теку демосайту |
| `FTP_PROTOCOL` | не задавайте (типово `ftps`); якщо FTPS не працює — `ftp` |

> Без окремого акаунта `FTP_DIR` має вести саме в теку демосайту й містити «demo», інакше workflow відмовиться заливати.

Паролі зберігаються лише в GitHub Secrets. У репозиторій і в чат вони не потрапляють.

## Як підтвердити заливку

1. Після кожного push у `main` у вкладці **Actions** з'являється запуск **«Deploy to hosting (demo.lvivimport.com)»**, і ви отримуєте лист від GitHub.
2. Відкрийте запуск → **Review deployments** → позначте `hosting` → **Approve and deploy**.
3. Через 1–2 хвилини зміни на https://demo.lvivimport.com.

Не хочете викладати? Натисніть **Reject**: сайт на хостингу лишиться попередній. Повторно викласти будь-яку версію можна через **Re-run jobs** у потрібному запуску.

## Що потрапляє на хостинг

- HTML-сторінки, стилі, скрипти, зображення з теки `out/`;
- [deploy/hosting/.htaccess](../deploy/hosting/.htaccess): сторінка 404, адреси без скісної риски на кінці, заборона індексації демосайту пошуковиками (`X-Robots-Tag: noindex`).

Заливаються лише змінені файли. Інших файлів у теці (наприклад, залишених хостингом) workflow не видаляє.
