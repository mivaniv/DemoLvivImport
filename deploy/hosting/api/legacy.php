<?php
// Переадресації 301 зі старих адрес lvivimport.com (WordPress/WooCommerce) на сторінки нового сайту.
// Сюди .htaccess передає лише адреси старого сайту, яких немає серед файлів нового:
//   /<мова>/…  (WPML: en, de, pl, cs, fr, it, es, pt-pt, ru)  → та сама сторінка українською;
//   /product/<стара-адреса>/      → товар за кодом 1С (api/legacy-urls.json → data/products.json);
//   /product-category/…/<slug>/   → каталог з цією категорією (за UUID категорії в 1С);
//   /catalog/cart/, /shop/, /my-account/, /home/, /team/ тощо → відповідні сторінки;
//   /?s=…                         → пошук у каталозі.
// Невідома адреса — сторінка 404 нового сайту. Таблицю старих адрес будує scripts/legacy-urls-from-wp.mjs.

declare(strict_types=1);

const LANGS = ['en', 'de', 'pl', 'cs', 'fr', 'it', 'es', 'pt-pt', 'ru', 'uk'];
// Сторінки, що є на новому сайті під тією ж адресою
const PAGES = ['about', 'reviews', 'promo', 'contacts', 'new-products', 'popular', 'terms-of-use', 'privacy-policy',
    'payment-and-delivery', 'exchange-and-return', 'brands', 'catalog', 'cart', 'account'];
// Сторінки й службові адреси WordPress, яких на новому сайті немає під тією ж адресою
const ALIASES = [
    '' => '/',
    'home' => '/',
    'team' => '/about/',
    'shop' => '/catalog/',
    'catalog/cart' => '/cart/',
    'catalog/checkout' => '/cart/',
    'checkout' => '/cart/',
    'catalog/cart/payment-and-delivery' => '/payment-and-delivery/',
    'catalog/exchange-and-return' => '/exchange-and-return/',
    'my-account' => '/account/',
];

$path = (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
$query = [];
parse_str((string) ($_SERVER['QUERY_STRING'] ?? ''), $query);
$target = legacy_target(rawurldecode($path), $query);

if ($target === null) {
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    @readfile(dirname(__DIR__) . '/404.html');
    exit;
}
// Стара адреса збіглася з чинною (товар отримав її пізніше) — без петлі: віддаємо шаблон товару
if (rtrim($target, '/') === rtrim(strtolower($path), '/')) {
    header('Content-Type: text/html; charset=utf-8');
    @readfile(dirname(__DIR__) . '/product/index.html');
    exit;
}
header('Location: ' . $target, true, 301);
header('Cache-Control: public, max-age=86400');
exit;

function legacy_target(string $path, array $query): ?string
{
    $p = trim(strtolower($path), '/');
    $parts = $p === '' ? [] : explode('/', $p);
    if ($parts && in_array($parts[0], LANGS, true)) {
        array_shift($parts); // нова версія поки лише українською
    }
    $rest = implode('/', $parts);

    // Пошук WordPress: /?s=…&post_type=product
    if ($rest === '' && isset($query['s']) && is_string($query['s']) && trim($query['s']) !== '') {
        return '/catalog/?q=' . rawurlencode(mb_substr(trim($query['s']), 0, 100));
    }

    if (($parts[0] ?? '') === 'product' && isset($parts[1])) {
        return product_target($parts[1]);
    }
    if (($parts[0] ?? '') === 'product-category') {
        return category_target((string) end($parts));
    }
    if (array_key_exists($rest, ALIASES)) {
        return ALIASES[$rest];
    }
    if (in_array($rest, PAGES, true)) {
        return "/$rest/";
    }
    return null;
}

function product_target(string $slug): string
{
    $legacy = legacy_urls();
    $catalog = catalog();
    $sku = array_key_exists($slug, $legacy['products']) ? $legacy['products'][$slug] : null;
    foreach ($catalog['products'] ?? [] as $p) {
        if (($sku !== null && ($p['sku'] ?? null) === $sku) || ($p['slug'] ?? null) === $slug) {
            return '/product/' . $p['slug'] . '/';
        }
    }
    return '/catalog/'; // товару більше немає
}

function category_target(string $slug): string
{
    $uuid = legacy_urls()['categories'][$slug] ?? null;
    foreach (catalog()['categories'] ?? [] as $c) {
        if (($uuid !== null && ($c['externalId'] ?? null) === $uuid) || ($c['slug'] ?? null) === $slug) {
            return '/catalog/?category=' . rawurlencode((string) $c['slug']);
        }
    }
    return '/catalog/';
}

function legacy_urls(): array
{
    static $data = null;
    if ($data === null) {
        $data = json_decode((string) @file_get_contents(__DIR__ . '/legacy-urls.json'), true);
        $data = is_array($data) ? $data + ['products' => [], 'categories' => []] : ['products' => [], 'categories' => []];
    }
    return $data;
}

function catalog(): array
{
    static $data = null;
    if ($data === null) {
        $data = json_decode((string) @file_get_contents(dirname(__DIR__) . '/data/products.json'), true);
        $data = is_array($data) ? $data : [];
    }
    return $data;
}
