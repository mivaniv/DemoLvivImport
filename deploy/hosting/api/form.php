<?php
// Обробник форм демосайту (статична збірка без Node.js): дзвінок, контакти, відгук, кошик-заявка.
// Перевіряє поля за тими самими правилами, що й серверні дії (src/app/actions/*.ts), надсилає лист
// на адресу з config.php (його створює workflow з GitHub Variable FORM_TO_EMAIL) і дописує
// кожне звернення в data/submissions.log — на випадок, якщо лист не дійде.
// Сумісно з PHP 7.4+.

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const DATA_DIR = __DIR__ . '/data';
const PHONE_RE = '/^[+\d][\d\s()-]{8,19}$/u';
const MAX_BODY = 200000;
const MAX_QTY = 100000;
const MAX_LINES = 200;
const DELIVERY = [
    'OWN_LOGISTICS' => 'Власна логістика Львівімпорт',
    'NOVA_POSHTA' => 'Нова пошта',
    'DELIVERY' => 'Делівері',
    'MEEST' => 'Meest',
    'PICKUP' => 'Самовивіз зі складу (м. Львів, вул. В. Великого, 2)',
];
const PHONE_MSG = 'Вкажіть телефон, наприклад +380 67 123 45 67';

function reply(int $code, array $body): void
{
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $message, int $code = 400): void
{
    reply($code, ['ok' => false, 'message' => $message]);
}

function ulen(string $s): int
{
    return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : (int) preg_match_all('/./us', $s);
}

function host(): string
{
    return strtolower(preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));
}

// ---------- запит ----------

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    fail('Method not allowed', 405);
}

// Лише з власних сторінок сайту
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin === '' || strtolower((string) parse_url($origin, PHP_URL_HOST)) !== host()) {
    fail('Forbidden', 403);
}

$config = @include __DIR__ . '/config.php';
if (!is_array($config) || empty($config['to'])) {
    fail('Форми тимчасово не працюють. Зателефонуйте нам, будь ласка.', 503);
}

$raw = (string) file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
$in = strlen($raw) > MAX_BODY ? null : json_decode($raw, true);
if (!is_array($in)) {
    fail('Некоректний запит');
}

function field(array $in, string $key): string
{
    $v = $in[$key] ?? '';
    if (is_int($v) || is_float($v)) {
        return (string) $v;
    }
    return is_string($v) ? trim($v) : '';
}

// ---------- перевірка ----------

$errors = [];

function check(string $field, bool $ok, string $message): void
{
    global $errors;
    if (!$ok && !isset($errors[$field])) {
        $errors[$field] = $message;
    }
}

function text(array $in, string $key, int $min, int $max, string $message): string
{
    $v = field($in, $key);
    check($key, ulen($v) >= $min && ulen($v) <= $max, ulen($v) > $max ? "Не більше $max символів" : $message);
    return $v;
}

function phone(array $in, string $key = 'phone'): string
{
    $v = field($in, $key);
    check($key, (bool) preg_match(PHONE_RE, $v), PHONE_MSG);
    return $v;
}

function email(array $in, bool $required): string
{
    $v = field($in, 'email');
    check('email', ($v === '' && !$required) || (ulen($v) <= 200 && filter_var($v, FILTER_VALIDATE_EMAIL) !== false), 'Некоректний email');
    return $v;
}

// ---------- кількості (як у src/lib/request-cart.ts) ----------

function by_box(array $p): bool
{
    return $p['minOrder'] > 1 && $p['unitsPerBox'] > 0;
}

function step(array $p): int
{
    return by_box($p) ? $p['unitsPerBox'] : 1;
}

function clamp_qty(array $p, int $qty): int
{
    $step = step($p);
    $min = max($step, (int) ceil(max(1, $p['minOrder']) / $step) * $step);
    $n = (int) ceil($qty / $step) * $step;
    return min((int) floor(MAX_QTY / $step) * $step, max($min, $n));
}

function fmt(float $n): string
{
    $r = round($n, 1);
    return number_format($r, $r == floor($r) ? 0 : 1, ',', ' ');
}

function describe_qty(array $p): string
{
    $qty = $p['qty'];
    if (by_box($p)) {
        return fmt($qty / step($p)) . " ящ. = $qty {$p['unit']}";
    }
    return $p['unitsPerBox'] > 0 ? "$qty {$p['unit']} ≈ " . fmt($qty / $p['unitsPerBox']) . ' ящ.' : "$qty {$p['unit']}";
}

function items(array $in): array
{
    $raw = $in['items'] ?? null;
    if (!is_array($raw)) {
        return [];
    }
    $str = function ($v, int $max): string {
        return is_string($v) ? trim(function_exists('mb_substr') ? mb_substr($v, 0, $max, 'UTF-8') : substr($v, 0, $max)) : '';
    };
    $int = function ($v): int {
        return is_int($v) && $v > 0 ? $v : 0;
    };
    $items = [];
    foreach (array_slice($raw, 0, MAX_LINES) as $r) {
        if (!is_array($r)) {
            continue;
        }
        $slug = $str($r['slug'] ?? null, 200);
        $name = $str($r['name'] ?? null, 300);
        $qty = $int($r['qty'] ?? null);
        if ($slug === '' || $name === '' || $qty === 0 || isset($items[$slug]) || !preg_match('/^[\w-]+$/u', $slug)) {
            continue;
        }
        $p = [
            'slug' => $slug,
            'name' => $name,
            'sku' => $str($r['sku'] ?? null, 60),
            'unit' => $str($r['unit'] ?? null, 20) ?: 'шт.',
            'unitsPerBox' => $int($r['unitsPerBox'] ?? null),
            'minOrder' => max(1, $int($r['minOrder'] ?? null)),
        ];
        $p['qty'] = clamp_qty($p, $qty);
        $items[$slug] = $p;
    }
    return array_values($items);
}

// ---------- журнал, ліміт частоти, лист ----------

function data_dir(): string
{
    if (!is_dir(DATA_DIR)) {
        @mkdir(DATA_DIR, 0700, true);
        @file_put_contents(DATA_DIR . '/.htaccess', "Require all denied\n");
    }
    return DATA_DIR;
}

// Не більше $limit звернень за $window секунд з однієї IP-адреси
function rate_ok(string $bucket, int $limit, int $window): bool
{
    $dir = data_dir() . '/rate';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $fp = @fopen($dir . '/' . hash('sha256', $bucket . '|' . ($_SERVER['REMOTE_ADDR'] ?? '')) . '.json', 'c+');
    if (!$fp) {
        return true;
    }
    flock($fp, LOCK_EX);
    $now = time();
    $list = json_decode((string) stream_get_contents($fp), true);
    $list = array_values(array_filter(is_array($list) ? $list : [], function ($t) use ($now, $window) {
        return is_int($t) && $t > $now - $window;
    }));
    $ok = count($list) < $limit;
    if ($ok) {
        $list[] = $now;
    }
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($list));
    flock($fp, LOCK_UN);
    fclose($fp);
    return $ok;
}

function log_submission(string $type, array $data, bool $mailed): void
{
    $line = json_encode([
        'time' => date('c'),
        'type' => $type,
        'mailed' => $mailed,
        'data' => $data,
    ], JSON_UNESCAPED_UNICODE);
    @file_put_contents(data_dir() . '/submissions.log', $line . "\n", FILE_APPEND | LOCK_EX);
}

function send_mail(array $config, string $subject, string $text, string $replyTo): bool
{
    if (!function_exists('mail')) {
        return false;
    }
    $from = (string) ($config['from'] ?? '');
    if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
        $from = 'noreply@' . host();
    }
    $enc = function (string $s): string {
        return '=?UTF-8?B?' . base64_encode($s) . '?=';
    };
    $headers = [
        'From: ' . $enc('Lviv Import — демосайт') . " <$from>",
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
    ];
    if ($replyTo !== '' && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
        $headers[] = "Reply-To: $replyTo";
    }
    if (function_exists('mb_substr')) {
        $subject = mb_substr($subject, 0, 100, 'UTF-8');
    }
    $body = chunk_split(base64_encode($text));
    $h = implode("\r\n", $headers);
    // -f задає адресу повернення; якщо хостинг її не дозволяє — без неї
    return @mail($config['to'], $enc($subject), $body, $h, "-f$from") || @mail($config['to'], $enc($subject), $body, $h);
}

function lines(array $rows): string
{
    return implode("\n", array_filter($rows, function ($l) {
        return $l !== null;
    }));
}

// ---------- форми ----------

if (field($in, 'website') !== '') {
    reply(200, ['ok' => true, 'message' => 'Дякуємо!']); // приманка для ботів
}

$type = field($in, 'type');
$page = 'https://' . host();

switch ($type) {
    case 'callback':
        $name = text($in, 'name', 2, 120, "Вкажіть ім'я");
        $phone = phone($in);
        $message = text($in, 'message', 0, 1000, 'Питання');
        $from = text($in, 'page', 0, 300, 'Сторінка');
        $limit = [5, 600];
        $subject = "Замовлення дзвінка: $name, $phone";
        $body = lines(["Ім'я: $name", "Телефон: $phone", $message !== '' ? "Питання: $message" : null, $from !== '' ? "Сторінка: $page$from" : null]);
        $replyTo = '';
        $done = 'Дякуємо! Менеджер зателефонує вам найближчим часом.';
        break;

    case 'contact':
        $first = text($in, 'firstName', 2, 80, "Вкажіть ім'я");
        $last = text($in, 'lastName', 0, 80, 'Прізвище');
        $replyTo = email($in, true);
        $phone = phone($in);
        $org = text($in, 'organization', 0, 200, 'Організація');
        $position = text($in, 'position', 0, 120, 'Посада');
        $message = text($in, 'message', 5, 5000, 'Напишіть повідомлення');
        $name = trim("$first $last");
        $limit = [5, 600];
        $subject = "Повідомлення з сайту: $name" . ($org !== '' ? ", $org" : '');
        $body = lines(["Ім'я: $name", "Email: $replyTo", "Телефон: $phone", $org !== '' ? "Організація: $org" : null, $position !== '' ? "Посада: $position" : null, '', $message]);
        $done = 'Дякуємо! Ми отримали ваше повідомлення й відповімо найближчим часом.';
        break;

    case 'review':
        $rating = (int) field($in, 'rating');
        check('rating', $rating >= 1 && $rating <= 5, 'Оберіть оцінку');
        $textValue = text($in, 'text', 10, 3000, 'Напишіть кілька слів про співпрацю');
        $author = text($in, 'author', 2, 80, "Вкажіть ім'я");
        $replyTo = email($in, false);
        check('consent', field($in, 'consent') === 'on', 'Потрібна згода на обробку персональних даних');
        $limit = [3, 3600];
        $subject = "Новий відгук: $author, $rating/5";
        $body = lines(["Автор: $author", $replyTo !== '' ? "Email: $replyTo" : null, "Оцінка: $rating/5", '', $textValue, '', 'У демоверсії відгук автоматично на сайт не потрапляє.']);
        $done = "Дякуємо за відгук! Він з'явиться на сайті після перевірки модератором.";
        break;

    case 'request':
        $method = field($in, 'deliveryMethod');
        check('deliveryMethod', isset(DELIVERY[$method]), 'Оберіть спосіб доставки');
        $city = text($in, 'deliveryCity', 0, 120, 'Населений пункт');
        $point = text($in, 'deliveryPoint', 0, 300, 'Адреса');
        if ($method !== 'PICKUP') {
            check('deliveryCity', $city !== '', 'Вкажіть населений пункт');
            check('deliveryPoint', $point !== '', $method === 'OWN_LOGISTICS' ? 'Вкажіть адресу доставки' : 'Вкажіть номер відділення');
        }
        $name = text($in, 'name', 2, 120, 'Вкажіть отримувача');
        $phone = phone($in);
        $company = text($in, 'company', 0, 200, 'Компанія');
        $replyTo = email($in, false);
        $comment = text($in, 'comment', 0, 2000, 'Коментар');
        $items = items($in);
        if (!$errors && !$items) {
            fail('Кошик порожній — додайте товари з каталогу.');
        }
        $rows = [];
        foreach ($items as $n => $i) {
            $rows[] = ($n + 1) . ". {$i['name']}" . ($i['sku'] !== '' ? " ({$i['sku']})" : '') . ' — ' . describe_qty($i);
            $rows[] = "   $page/product/{$i['slug']}/";
        }
        $delivery = (DELIVERY[$method] ?? '') . ($method !== 'PICKUP' ? " — $city, $point" : '');
        $limit = [5, 600];
        $subject = 'Заявка з кошика: ' . ($company !== '' ? $company : $name) . ', ' . count($items) . ' поз.';
        $body = lines(array_merge(
            ["Отримувач: $name", "Телефон: $phone", $company !== '' ? "Компанія: $company" : null, $replyTo !== '' ? "Email: $replyTo" : null, '', 'Товари:'],
            $rows,
            ['', "Доставка: $delivery", $comment !== '' ? "Коментар: $comment" : null]
        ));
        $done = "Дякуємо! Менеджер зв'яжеться з вами, щоб підтвердити ціни, наявність і доставку.";
        break;

    default:
        fail('Невідома форма');
}

if ($errors) {
    reply(422, ['ok' => false, 'fieldErrors' => $errors]);
}

if (!rate_ok($type, $limit[0], $limit[1])) {
    fail('Забагато звернень. Спробуйте за кілька хвилин або зателефонуйте нам.', 429);
}

$body .= "\n\n— Надіслано з $page";
$mailed = send_mail($config, $subject, $body, $replyTo);
log_submission($type, ['subject' => $subject, 'text' => $body, 'replyTo' => $replyTo], $mailed);

reply(200, ['ok' => true, 'message' => $done]);
