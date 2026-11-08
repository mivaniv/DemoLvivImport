<?php
// Щоденне оновлення каталогу демосайту на хостингу (крон DirectAdmin, див. docs/hosting.md):
// 1. бере вивантаження 1С (<goods>) і зберігає копію в api/data/imports/:
//    --source=ТЕКА — прямо з диска, з теки, куди 1С заливає файли по FTP (products_full.XML + photo/);
//    без --source — одним запитом за посиланням 'feed' з config.php (старий режим, через сайт джерела);
// 2. перетворює його в data/products.json — той самий алгоритм, що src/importer/feed-to-catalog.ts
//    (змінюючи щось тут, змініть і там; перевірка збігу — docs/hosting.md);
// 3. фото кладе в images_backup/ поруч із сайтом:
//    з --source — готує сам з оригіналів у photo/ (білий фон, до 1500 px, JPEG), лише нові й змінені;
//    без --source — докачує відсутні з images_backup/ джерела (або з його теки photo/);
// 4. оновлює sitemap.xml і data/catalog-status.json, прибирає старі теки сторінок товарів;
// 5. якщо щось пішло не так — каталог лишається попередній, на FORM_TO_EMAIL іде лист.
//
// php update-catalog.php [--source=ТЕКА] [--dry-run] [--feed=файл] [--image-base=URL] [--no-images] [--now=ISO]
// Лише з командного рядка; з браузера закрито (тут і в api/.htaccess). Сумісно з PHP 7.4+.

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}

set_time_limit(0);
ini_set('memory_limit', '512M');
@date_default_timezone_set('Europe/Kyiv') || @date_default_timezone_set('Europe/Kiev');

define('ROOT', dirname(__DIR__)); // public_html демосайту
const DATA_DIR = __DIR__ . '/data';
const IMPORTS_DIR = DATA_DIR . '/imports';
const IMAGES_DIR = ROOT . '/images_backup';
const KEEP_FEEDS = 14;
const MAX_FEED_BYTES = 200 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_PAUSE_US = 1000000; // пауза між запитами фото, щоб не спрацював фаєрвол
const USER_AGENT = 'lvivimport.com catalog update';
const PHOTO_MANIFEST = DATA_DIR . '/photos.json'; // фото → контрольна сума оригіналу, з якого воно зроблене
const PHOTO_MAX_SIDE = 1500;
const PHOTO_QUALITY = 82;
const FEED_SETTLE_SEC = 120;      // файл, змінений щойно, ще може заливатись по FTP — чекаємо
const FEED_STALE_SEC = 36 * 3600; // 1С заливає щоночі; старіший файл — привід написати листа

// Ті самі пороги, що в run-sync.ts і IMPORT_CLEANUP_MAX_RATIO
const MAX_INVALID_RATIO = 0.2;
const MAX_REMOVED_RATIO = 0.3;

// Вивантаження lvivimport.com: див. src/importer/adapters/goods.ts
const HIDDEN_CATEGORY = 'ae67cc39-3241-11ec-8102-001e67f8ed26';
const NOT_BRANDS = ['tea', 'coffe', 'coffee', 'cappuccino', 'horeca'];
const STATIC_PAGES = ['', '/catalog', '/promo', '/new-products', '/popular', '/brands', '/about', '/reviews', '/contacts',
    '/payment-and-delivery', '/exchange-and-return', '/terms-of-use', '/privacy-policy'];

final class FeedError extends Exception
{
}

exit(main(array_slice($argv, 1)));

function main(array $args): int
{
    $opt = ['dry-run' => false, 'no-images' => false, 'source' => '', 'feed' => '', 'image-base' => '', 'now' => ''];
    foreach ($args as $arg) {
        if (!preg_match('/^--([a-z-]+)(?:=(.*))?$/', $arg, $m) || !array_key_exists($m[1], $opt)) {
            fwrite(STDERR, "Невідомий параметр $arg\n");
            return 2;
        }
        $opt[$m[1]] = isset($m[2]) ? $m[2] : true;
    }
    $dry = $opt['dry-run'] === true;

    if (!is_dir(DATA_DIR) && !@mkdir(DATA_DIR, 0755, true)) {
        fwrite(STDERR, 'Не вдалося створити ' . DATA_DIR . "\n");
        return 1;
    }
    $lock = fopen(DATA_DIR . '/update-catalog.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) {
        fwrite(STDERR, "Оновлення вже виконується\n");
        return 2;
    }

    $config = @include __DIR__ . '/config.php';
    $config = is_array($config) ? $config : [];
    $now = $opt['now'] !== '' ? new DateTimeImmutable((string) $opt['now']) : new DateTimeImmutable('now');

    try {
        $previous = read_json(ROOT . '/data/products.json') ?? ['categories' => [], 'brands' => [], 'products' => []];

        $sourceUrl = null;
        $sourceDir = null;
        $feedTime = null;
        $stale = null;
        if ($opt['feed'] !== '') {
            $text = @file_get_contents((string) $opt['feed']);
            if ($text === false) {
                throw new FeedError("Не вдалося прочитати файл {$opt['feed']}");
            }
        } elseif ($opt['source'] !== '') {
            $sourceDir = rtrim((string) $opt['source'], '/');
            [$text, $feedTime] = read_local_feed($sourceDir, $dry);
            if ($now->getTimestamp() - $feedTime > FEED_STALE_SEC) {
                $stale = 'Файл 1С не оновлювався з ' . date('d.m.Y H:i', $feedTime) . ' — каталог зібрано з нього. Перевірте вивантаження з 1С.';
            }
        } else {
            $sourceUrl = trim((string) ($config['feed'] ?? ''));
            if ($sourceUrl === '') {
                throw new FeedError('Не задано ні теку 1С (--source у команді крона), ні посилання на вивантаження (GitHub Secret IMPORT_SOURCE_URL) — див. docs/hosting.md');
            }
            $text = download_feed($sourceUrl, $dry);
        }

        // Режим --source: фото одразу з локальними адресами, сайт джерела не потрібен
        $imageBase = $opt['image-base'] !== '' ? (string) $opt['image-base']
            : ($sourceDir !== null ? '/images_backup/' : ($sourceUrl !== null ? image_base_for($sourceUrl) : null));
        [$catalog, $report] = feed_to_catalog($text, $previous, $imageBase, $now);

        $images = null;
        if ($opt['no-images'] !== true && $sourceDir !== null && $opt['image-base'] === '') {
            $images = local_photos($catalog, "$sourceDir/photo", $dry);
        } elseif ($opt['no-images'] !== true && $imageBase !== null) {
            $images = localize_images($catalog, $imageBase, $dry);
        }
        $oldDirs = remove_old_product_dirs($dry);

        $summary = sprintf(
            'товарів %d (нових %d, вилучено %d), категорій %d, брендів %d',
            count($catalog['products']),
            $report['created'],
            $report['removed'],
            count($catalog['categories']),
            count($catalog['brands'])
        );
        if ($images !== null && $sourceDir !== null) {
            $summary .= sprintf(
                $dry ? '; фото: %d, оновити %d, без змін %d, немає в 1С %d (є старі %d), видалити %d'
                    : '; фото: %d, оновлено %d, без змін %d, немає в 1С %d (лишились старі %d), не вдалося %7$d, видалено %6$d',
                $images['total'], $images['converted'], $images['present'], $images['missing'], $images['keptOld'], $images['deleted'], $images['failed']
            );
            if (!$images['gd']) {
                $summary .= '; GD немає — фото скопійовано без обробки';
            }
        } elseif ($images !== null) {
            $summary .= sprintf($dry ? '; фото: %d, докачати %d, видалити %4$d' : '; фото: %d, докачано %d (з теки photo %5$d), не вдалося %d, видалено %d', $images['total'], $images['downloaded'], $images['failed'], $images['deleted'], $images['fromPhoto']);
        }
        if ($oldDirs > 0) {
            $summary .= ($dry ? '; старих тек товарів видалити: ' : '; старих тек товарів видалено: ') . $oldDirs;
        }
        if ($feedTime !== null) {
            $summary .= '; файл 1С від ' . date('d.m.Y H:i', $feedTime);
        }

        if ($dry) {
            echo "Перевірка без змін: $summary\n";
            // Крон не показує вивід, тож перевірку видно в журналі
            log_line("ПЕРЕВІРКА: $summary" . ($stale !== null ? "; УВАГА: $stale" : ''));
        } else {
            write_atomic(ROOT . '/data/products.json', json_out($catalog));
            write_atomic(ROOT . '/sitemap.xml', sitemap($catalog['products'], (string) ($config['site'] ?? 'https://demo.lvivimport.com')));
            write_status([
                'ok' => true,
                'checkedAt' => iso($now),
                'updatedAt' => iso($now),
                'products' => count($catalog['products']),
                'categories' => count($catalog['categories']),
                'brands' => count($catalog['brands']),
                'created' => $report['created'],
                'removed' => $report['removed'],
                'warnings' => count($report['warnings']),
                'images' => $images,
                'source' => $sourceDir !== null ? '1c-folder' : ($sourceUrl !== null ? 'url' : 'file'),
                'feedAt' => $feedTime !== null ? iso((new DateTimeImmutable())->setTimestamp($feedTime)) : null,
                'message' => $stale,
            ]);
            log_line("OK: $summary" . ($report['warnings'] ? '; попереджень: ' . count($report['warnings']) : '') . ($stale !== null ? "; УВАГА: $stale" : ''));
            echo "Каталог оновлено: $summary\n";
            if ($stale !== null) {
                notify($config, $stale, 'Файл 1С для демосайту не оновлюється');
            }
        }
        foreach (array_slice($report['warnings'], 0, 20) as $w) {
            echo "  ! $w\n";
        }
        return 0;
    } catch (Throwable $e) {
        $message = $e instanceof FeedError ? $e->getMessage() : 'Помилка: ' . $e->getMessage();
        fwrite(STDERR, "Каталог не оновлено: $message\n");
        if (!$dry) {
            $status = read_json(ROOT . '/data/catalog-status.json') ?? [];
            write_status(array_merge($status, ['ok' => false, 'checkedAt' => iso($now), 'message' => $message]));
            log_line("ПОМИЛКА: $message");
            notify($config, $message);
        }
        return 1;
    }
}

// ---------- Вивантаження → каталог (як src/importer/feed-to-catalog.ts) ----------

function feed_to_catalog(string $text, array $previous, ?string $imageBase, DateTimeImmutable $now): array
{
    $file = parse_goods($text, $imageBase ?? 'images_backup/');

    $warnings = [];
    $items = [];
    $seen = [];
    foreach ($file['products'] as $p) {
        $label = trim(($p['id'] ?? '') . ' ' . ($p['name'] ?? '')) ?: 'товар';
        if ($p['id'] === null || mb_strlen($p['name']) < 2) {
            $warnings[] = "$label: " . ($p['id'] === null ? 'немає ID' : 'закоротка назва');
        } elseif (isset($seen[$p['id']])) {
            $warnings[] = "$label: дубль ID у файлі — пропущено";
        } else {
            $seen[$p['id']] = true;
            $items[] = $p;
        }
    }
    $total = count($file['products']);
    if ($total === 0) {
        throw new FeedError('У файлі немає товарів');
    }
    if (($total - count($items)) / $total > MAX_INVALID_RATIO) {
        throw new FeedError(sprintf('Забагато некоректних товарів (%d з %d) — каталог не змінено', $total - count($items), $total));
    }
    $removed = 0;
    foreach ($previous['products'] as $old) {
        if (!isset($seen[$old['externalId']])) {
            $removed++;
        }
    }
    if (count($previous['products']) > 0 && $removed / count($previous['products']) > MAX_REMOVED_RATIO) {
        throw new FeedError(sprintf('У файлі бракує %d з %d товарів сайту — схоже на неповне вивантаження, каталог не змінено', $removed, count($previous['products'])));
    }
    foreach ($items as $p) {
        foreach ($p['images'] as $url) {
            // повна адреса або шлях від кореня сайту (режим --source: /images_backup/…)
            if (!preg_match('~^(https?://|/[^/])~i', $url)) {
                throw new FeedError("Фото «{$url}» без повної адреси: вкажіть адресу теки з фото (--image-base)");
            }
        }
    }

    // Категорії: ті самі id і slug, що й раніше (за ID з 1С; у старих знімках — за slug назви)
    $newCategoryId = next_id($previous['categories']);
    $categorySlugs = array_fill_keys(array_column($previous['categories'], 'slug'), true);
    $prevCategoryByExt = [];
    $hasExt = false;
    foreach ($previous['categories'] as $c) {
        if (!empty($c['externalId'])) {
            $prevCategoryByExt[$c['externalId']] = $c;
            $hasExt = true;
        }
    }
    $prevCategoryBySlug = [];
    if (!$hasExt) {
        foreach ($previous['categories'] as $c) {
            $prevCategoryBySlug[$c['slug']] = $c;
        }
    }
    $categories = [];
    foreach ($file['categories'] as $c) {
        $old = $prevCategoryByExt[$c['id']] ?? null;
        if ($old === null) {
            foreach ([slugify($c['name']) . '-' . slugify($c['id']), slugify($c['name'])] as $slug) {
                if (isset($prevCategoryBySlug[$slug])) {
                    $old = $prevCategoryBySlug[$slug];
                    unset($prevCategoryBySlug[$slug]);
                    break;
                }
            }
        }
        $categories[] = [
            'id' => $old !== null ? $old['id'] : $newCategoryId(),
            'externalId' => $c['id'],
            'slug' => $old !== null ? $old['slug'] : unique_slug($categorySlugs, $c['name'], $c['id']),
            'name' => $c['name'],
            'sortOrder' => $c['sortOrder'] ?? ($old['sortOrder'] ?? 0),
            'parentExternalId' => $c['parentId'],
        ];
    }
    $categoryByExt = [];
    $categoryById = [];
    foreach ($categories as $c) {
        $categoryByExt[$c['externalId']] = $c;
        $categoryById[$c['id']] = $c;
    }

    // Бренди: за slug назви, як у базі (назву й країну наявного бренду не перезаписуємо)
    $newBrandId = next_id($previous['brands']);
    $prevBrandBySlug = array_column($previous['brands'], null, 'slug');
    $brandBySlug = [];
    foreach ($items as $p) {
        if ($p['brand'] !== null) {
            $slug = slugify($p['brand']);
            if (!isset($brandBySlug[$slug])) {
                $brandBySlug[$slug] = $prevBrandBySlug[$slug] ?? ['id' => $newBrandId(), 'slug' => $slug, 'name' => $p['brand'], 'country' => null];
            }
        }
    }

    $newProductId = next_id($previous['products']);
    $productSlugs = array_fill_keys(array_column($previous['products'], 'slug'), true);
    $prevProductByExt = array_column($previous['products'], null, 'externalId');
    $createdAt = iso($now);
    $created = 0;

    // Поле, якого немає у файлі, береться з попереднього каталогу — як оновлення в базі
    $products = [];
    foreach ($items as $index => $p) {
        $old = $prevProductByExt[$p['id']] ?? null;
        if ($old === null) {
            $created++;
        }
        $category = $p['categoryId'] !== null ? ($categoryByExt[$p['categoryId']] ?? null) : null;
        if ($p['categoryId'] !== null && $category === null) {
            $warnings[] = "{$p['id']} {$p['name']}: невідома категорія {$p['categoryId']} — товар без категорії";
        }
        $keep = function ($value, string $key, $fallback) use ($old) {
            return $value !== null ? $value : ($old !== null && array_key_exists($key, $old) ? $old[$key] : $fallback);
        };
        $products[] = [
            'id' => $old !== null ? $old['id'] : $newProductId(),
            'externalId' => $p['id'],
            'sku' => $keep($p['sku'], 'sku', null),
            'barcode' => $keep($p['barcode'], 'barcode', null),
            'slug' => $old !== null ? $old['slug'] : unique_slug($productSlugs, $p['name'], $p['sku'] ?? $p['id']),
            'name' => $p['name'],
            'description' => $keep($p['description'], 'description', null),
            'netWeight' => $keep($p['netWeight'], 'netWeight', null),
            'unitsPerBox' => $keep($p['unitsPerBox'], 'unitsPerBox', null),
            'unit' => $keep($p['unit'], 'unit', 'шт.'),
            'minOrder' => $keep($p['minOrder'], 'minOrder', 1),
            'inStock' => $keep($p['inStock'], 'inStock', true),
            'isPopular' => $keep($p['popular'], 'isPopular', false),
            'isNew' => $keep($p['isNew'], 'isNew', false),
            'isSale' => $keep($p['sale'], 'isSale', false),
            'sortOrder' => $index,
            'categoryId' => $p['categoryId'] !== null ? ($category['id'] ?? null) : ($old['categoryId'] ?? null),
            'brandId' => $p['brand'] !== null ? ($brandBySlug[slugify($p['brand'])]['id'] ?? null) : ($old['brandId'] ?? null),
            'createdAt' => $old['createdAt'] ?? $createdAt,
            'images' => array_map(function ($url) use ($p) {
                return ['url' => $url, 'alt' => $p['name']];
            }, $p['images']),
            'attributes' => $old['attributes'] ?? [],
        ];
    }

    // Лише категорії з товарами та їхні батьківські розділи (для дерева в каталозі)
    $used = [];
    foreach ($products as $p) {
        for ($id = $p['categoryId']; $id !== null && !isset($used[$id]);) {
            $used[$id] = true;
            $parent = $categoryById[$id]['parentExternalId'] ?? null;
            $id = $parent !== null && isset($categoryByExt[$parent]) ? $categoryByExt[$parent]['id'] : null;
        }
    }
    $outCategories = array_values(array_filter($categories, function ($c) use ($used) {
        return isset($used[$c['id']]);
    }));
    usort($outCategories, function ($a, $b) {
        return ($a['sortOrder'] <=> $b['sortOrder']) ?: ($a['id'] <=> $b['id']);
    });
    $outCategories = array_map(function ($c) use ($categoryByExt) {
        $parent = $c['parentExternalId'];
        unset($c['parentExternalId']);
        $c['parentId'] = $parent !== null && isset($categoryByExt[$parent]) ? $categoryByExt[$parent]['id'] : null;
        return $c;
    }, $outCategories);

    $usedBrands = array_fill_keys(array_filter(array_column($products, 'brandId'), 'is_int'), true);
    $outBrands = array_values(array_filter($brandBySlug, function ($b) use ($usedBrands) {
        return isset($usedBrands[$b['id']]);
    }));
    usort($outBrands, function ($a, $b) {
        return strcmp($a['name'], $b['name']) ?: ($a['id'] <=> $b['id']);
    });

    return [
        ['categories' => $outCategories, 'brands' => $outBrands, 'products' => $products],
        ['total' => $total, 'created' => $created, 'removed' => $removed, 'warnings' => $warnings],
    ];
}

function next_id(array $rows): callable
{
    $max = 0;
    foreach ($rows as $r) {
        $max = max($max, (int) $r['id']);
    }
    return function () use (&$max) {
        return ++$max;
    };
}

// Як uniqueSlug: назва, за збігу — назва-артикул (або ID), далі — назва-2, -3…
function unique_slug(array &$taken, string $name, string $suffix): string
{
    $base = slugify($name) ?: (slugify($suffix) ?: 'item');
    $slug = null;
    foreach ([$base, $base . '-' . slugify($suffix)] as $candidate) {
        if (!isset($taken[$candidate])) {
            $slug = $candidate;
            break;
        }
    }
    for ($i = 2; $slug === null; $i++) {
        if (!isset($taken["$base-$i"])) {
            $slug = "$base-$i";
        }
    }
    $taken[$slug] = true;
    return $slug;
}

// ---------- Розбір <goods> (як src/importer/adapters/goods.ts) ----------

function parse_goods(string $text, string $imageBase): array
{
    libxml_use_internal_errors(true);
    $flags = LIBXML_NONET | LIBXML_NOCDATA | LIBXML_COMPACT | (defined('LIBXML_PARSEHUGE') ? LIBXML_PARSEHUGE : 0);
    $xml = simplexml_load_string($text, 'SimpleXMLElement', $flags);
    if ($xml === false) {
        $err = libxml_get_errors()[0] ?? null;
        throw new FeedError('Не вдалося розібрати файл: ' . ($err ? trim($err->message) . " (рядок {$err->line})" : 'некоректний XML'));
    }
    if ($xml->getName() !== 'goods') {
        throw new FeedError('Не вдалося розібрати файл: очікується вивантаження lvivimport.com (<goods>)');
    }

    $cats = [];
    foreach (children($xml->categories, 'cat') as $c) {
        if (str($c->category_id) !== HIDDEN_CATEGORY) {
            $cats[] = $c;
        }
    }
    $known = [];
    foreach ($cats as $c) {
        $known[(string) str($c->category_id)] = true;
    }
    $categories = [];
    foreach ($cats as $i => $c) {
        $id = str($c->category_id);
        $raw = str($c->name);
        if ($id === null || $raw === null) {
            continue;
        }
        [$name, $order] = category_name($raw);
        $parentId = str($c->parent_id);
        $categories[] = ['id' => $id, 'name' => $name, 'parentId' => $parentId !== null && isset($known[$parentId]) ? $parentId : null, 'sortOrder' => $order ?? 1000 + $i];
    }

    // Бренд — назва категорії (чи її перше латинське слово), якщо вона є окремим словом у назві товару
    $catNames = array_column($categories, 'name', 'id');
    $parentOf = array_column($categories, 'parentId', 'id');
    $brandFor = function (?string $categoryId, string $productName) use ($catNames, $parentOf): ?string {
        for ($id = $categoryId; $id !== null && $id !== ''; $id = $parentOf[$id] ?? null) {
            $name = isset($catNames[$id]) ? preg_replace('/\s+[0-9]+$/uD', '', $catNames[$id]) : '';
            foreach ([$name, explode(' ', $name)[0]] as $candidate) {
                if (!preg_match('/^[a-z][a-z0-9 !\'&.-]*$/iD', $candidate) || in_array(strtolower($candidate), NOT_BRANDS, true)) {
                    continue;
                }
                if (has_word($productName, $candidate)) {
                    return preg_replace_callback('/(^|\s)\p{L}/u', function ($m) {
                        return mb_strtoupper($m[0], 'UTF-8');
                    }, $candidate);
                }
            }
        }
        return null;
    };

    $products = [];
    foreach (children($xml->products, 'product') as $p) {
        $name = str($p->name) ?? '';
        $categoryId = str($p->category_id);
        $unitsPerBox = to_positive_int(str($p->qty));
        $images = [];
        foreach (children($p->images, 'image') as $v) {
            foreach (explode(',', str($v) ?? '') as $f) {
                $f = js_trim($f);
                if ($f !== '') {
                    $images[] = preg_match('~^https?://~i', $f) ? $f : $imageBase . image_file($f);
                }
            }
        }
        $products[] = [
            'id' => str($p->uuid),
            'sku' => str($p->code),
            'name' => $name,
            'categoryId' => $categoryId !== null && isset($known[$categoryId]) ? $categoryId : null,
            'brand' => $brandFor($categoryId, $name),
            'description' => html_to_text(str($p->description)),
            'netWeight' => weight_from_name($name),
            'unitsPerBox' => $unitsPerBox,
            'unit' => 'шт.',
            'inStock' => flag($p->ammount) ?? false,
            'popular' => flag($p->top),
            'isNew' => flag($p->new),
            'sale' => flag($p->discount) === true ? true : null,
            'barcode' => str($p->barcode),
            // «Від 1 шт» лише для позначених from_piece, інакше — від ящика
            'minOrder' => flag($p->from_piece) === true ? 1 : $unitsPerBox,
            'images' => $images,
        ];
    }

    // Товари з рубрик «Інші ТМ» тощо: шукаємо в назві бренди, вже знайдені в каталозі (довші — першими)
    $brands = [];
    foreach ($products as $p) {
        if ($p['brand'] !== null && !in_array($p['brand'], $brands, true)) {
            $brands[] = $p['brand'];
        }
    }
    $order = array_flip($brands);
    usort($brands, function ($a, $b) use ($order) {
        return (strlen($b) <=> strlen($a)) ?: ($order[$a] <=> $order[$b]);
    });
    foreach ($products as &$p) {
        if ($p['brand'] === null) {
            foreach ($brands as $b) {
                if (has_word($p['name'], $b)) {
                    $p['brand'] = $b;
                    break;
                }
            }
        }
    }
    unset($p);

    return ['categories' => $categories, 'products' => $products];
}

function children($node, string $name): array
{
    if (!$node instanceof SimpleXMLElement || !isset($node->{$name})) {
        return [];
    }
    $out = [];
    foreach ($node->{$name} as $child) {
        $out[] = $child;
    }
    return $out;
}

// Значення вузла як рядок без пробілів по краях; порожнє — null
function str($node): ?string
{
    if (!$node instanceof SimpleXMLElement || $node->getName() === '') {
        return null;
    }
    $s = js_trim((string) $node);
    return $s === '' ? null : $s;
}

// trim() як у JavaScript: прибирає й нерозривні та інші юнікод-пробіли
function js_trim(string $s): string
{
    return preg_replace('/^[\s\x{FEFF}\x{A0}]+|[\s\x{FEFF}\x{A0}]+$/uD', '', $s);
}

function flag($node): ?bool
{
    $s = str($node);
    if ($s === null) {
        return null;
    }
    return is_numeric($s) ? (float) $s > 0 : false;
}

// «12 шт», "12,0" → 12
function to_positive_int(?string $value): ?int
{
    $s = preg_replace('/[^0-9.]/', '', preg_replace('/,/', '.', $value ?? '', 1));
    if (!preg_match('/^(?:[0-9]+\.?[0-9]*|\.[0-9]+)/', $s, $m)) {
        return null;
    }
    $n = (float) $m[0];
    return $n > 0 ? (int) round($n) : null;
}

// «12.КАВА І ЧАЙ» → назва «Кава і чай» і номер для сортування 12
function category_name(string $raw): array
{
    $matched = preg_match('/^([0-9]+)\.\s*(.*)$/uD', js_trim($raw), $m);
    $text = mb_strtolower(preg_replace('/\s+/u', ' ', js_trim($matched ? $m[2] : $raw)), 'UTF-8');
    return [mb_strtoupper(mb_substr($text, 0, 1, 'UTF-8'), 'UTF-8') . mb_substr($text, 1, null, 'UTF-8'), $matched ? (int) $m[1] : null];
}

// Фото на сервері лежать як .jpeg
function image_file(string $name): string
{
    $file = preg_replace('/\.(jpe?g|png)$/iD', '.jpeg', js_trim($name));
    original_image($file, js_trim($name));
    return $file;
}

// Назва фото у вивантаженні (00-…-1.jpg / .png): під нею оригінал лежить у теці photo/ джерела
function original_image(string $file, ?string $name = null): ?string
{
    static $names = [];
    if ($name !== null && !isset($names[$file])) {
        $names[$file] = $name;
    }
    return $names[$file] ?? null;
}

// «… 4TEA 220g ск/б» → «220 г»
function weight_from_name(string $name): ?string
{
    if (!preg_match('/([0-9]+(?:[.,][0-9]+)?)\s?(g|г|kg|кг|ml|мл|l|л)(?![\p{L}])/iu', $name, $m)) {
        return null;
    }
    $unit = mb_strtolower($m[2], 'UTF-8');
    $unit = ['g' => 'г', 'kg' => 'кг', 'ml' => 'мл', 'l' => 'л'][$unit] ?? $unit;
    return preg_replace('/\./', ',', $m[1], 1) . ' ' . $unit;
}

// Слово в назві окремо, а не частиною іншого: TEA ≠ 4TEA
function has_word(string $text, string $word): bool
{
    return (bool) preg_match('/(?<![\p{L}\p{N}])' . preg_quote($word, '/') . '(?![\p{L}\p{N}])/iu', $text);
}

// Як htmlToText у src/importer/mapping.ts
function html_to_text(?string $html): ?string
{
    if ($html === null || $html === '') {
        return null;
    }
    $entities = ['nbsp' => ' ', 'amp' => '&', 'lt' => '<', 'gt' => '>', 'quot' => '"', 'apos' => "'", 'laquo' => '«', 'raquo' => '»', 'ndash' => '–', 'mdash' => '—'];
    $text = preg_replace('/<\s*br\s*\/?>/iu', "\n", $html);
    $text = preg_replace('/<\/\s*(p|div|li|h[0-9])\s*>/iu', "\n", $text);
    $text = preg_replace('/<[^>]+>/u', '', $text);
    $text = preg_replace_callback('/&(#[0-9]+|#x[0-9a-f]+|[A-Za-z0-9_]+);/iu', function ($m) use ($entities) {
        $e = $m[1];
        if ($e[0] === '#') {
            $code = ($e[1] === 'x' || $e[1] === 'X') ? hexdec(substr($e, 2)) : (int) substr($e, 1);
            $ch = $code <= 0x10FFFF ? mb_chr((int) $code, 'UTF-8') : false;
            return $ch === false ? $m[0] : $ch;
        }
        return $entities[strtolower($e)] ?? $m[0];
    }, $text);
    $text = preg_replace('/[ \t]+/u', ' ', $text);
    $text = preg_replace('/ *\n */u', "\n", $text);
    $text = preg_replace('/\n{3,}/u', "\n\n", $text);
    $text = js_trim($text);
    return $text === '' ? null : $text;
}

// Як src/lib/slug.ts: транслітерація (КМУ №55) і латиниця без діакритики
function slugify(string $input): string
{
    static $map = [
        'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'h', 'ґ' => 'g', 'д' => 'd', 'е' => 'e', 'є' => 'ie', 'ж' => 'zh', 'з' => 'z',
        'и' => 'y', 'і' => 'i', 'ї' => 'i', 'й' => 'i', 'к' => 'k', 'л' => 'l', 'м' => 'm', 'н' => 'n', 'о' => 'o', 'п' => 'p',
        'р' => 'r', 'с' => 's', 'т' => 't', 'у' => 'u', 'ф' => 'f', 'х' => 'kh', 'ц' => 'ts', 'ч' => 'ch', 'ш' => 'sh',
        'щ' => 'shch', 'ь' => '', 'ю' => 'iu', 'я' => 'ia', 'ы' => 'y', 'э' => 'e', 'ё' => 'io', 'ъ' => '',
        "'" => '', '’' => '', 'ʼ' => '',
    ];
    // Без розширення intl: латиниця з діакритикою (U+00C0–U+024F), яку розкладає NFD
    static $accents = null;
    if ($accents === null) {
        $from = 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿāăąćĉċčďēĕėęěĝğġģĥĩīĭįĵķĺļľńņňōŏőŕŗřśŝşšţťũūŭůűųŵŷźżžơưǎǐǒǔǖǘǚǜǟǡǧǩǫǭǰǵǹǻȁȃȅȇȉȋȍȏȑȓȕȗșțȟȧȩȫȭȯȱȳ';
        $to = 'aaaaaaceeeeiiiinooooouuuuyyaaaccccdeeeeegggghiiiijklllnnnooorrrssssttuuuuuuwyzzzouaiouuuuuaagkoojgnaaaeeiioorruusthaeooooy';
        $accents = array_combine(preg_split('//u', $from, -1, PREG_SPLIT_NO_EMPTY), str_split($to));
    }
    $intl = class_exists('Normalizer');
    $s = mb_strtolower($input, 'UTF-8');
    if ($intl) {
        $s = Normalizer::normalize($s, Normalizer::FORM_C);
    }
    $s = strtr($s, $map);
    $s = $intl ? Normalizer::normalize($s, Normalizer::FORM_D) : strtr($s, $accents);
    $s = preg_replace('/[\x{0300}-\x{036F}]/u', '', $s);
    $s = trim(preg_replace('/[^a-z0-9]+/', '-', $s), '-');
    return substr($s, 0, 80);
}

// ---------- Файли на хостингу ----------

// Тека з фото — images_backup/ поруч із файлом вивантаження (як absoluteUrl у goods.ts)
function image_base_for(string $url): string
{
    $u = parse_url($url);
    $path = $u['path'] ?? '/';
    $auth = isset($u['user']) ? $u['user'] . (isset($u['pass']) ? ':' . $u['pass'] : '') . '@' : '';
    $port = isset($u['port']) ? ':' . $u['port'] : '';
    return strtolower($u['scheme'] ?? 'https') . '://' . $auth . strtolower($u['host'] ?? '') . $port . substr($path, 0, strrpos($path, '/') + 1) . 'images_backup/';
}

// Один запит на день: файл зберігається в api/data/imports/ (останні KEEP_FEEDS копій)
function download_feed(string $url, bool $dry): string
{
    if (!is_dir(IMPORTS_DIR) && !@mkdir(IMPORTS_DIR, 0755, true)) {
        throw new FeedError('Не вдалося створити теку ' . IMPORTS_DIR);
    }
    $tmp = IMPORTS_DIR . '/download.tmp';
    $error = '';
    for ($attempt = 0; $attempt <= 2; $attempt++) {
        if ($attempt > 0) {
            sleep(10 * $attempt);
        }
        [$ok, $error, $retry] = http_to_file($url, $tmp, MAX_FEED_BYTES, 120);
        if ($ok || !$retry) {
            break;
        }
    }
    if (!$ok) {
        @unlink($tmp);
        throw new FeedError("Не вдалося завантажити вивантаження: $error");
    }
    $text = (string) file_get_contents($tmp);
    if (trim($text) === '') {
        @unlink($tmp);
        throw new FeedError('Джерело повернуло порожній файл');
    }
    @unlink($tmp);
    if (!$dry) {
        save_feed_copy($text);
    }
    return $text;
}

// Копія вивантаження в api/data/imports/: остання — products_full.xml, плюс KEEP_FEEDS датованих
function save_feed_copy(string $text): void
{
    if (!is_dir(IMPORTS_DIR) && !@mkdir(IMPORTS_DIR, 0755, true)) {
        throw new FeedError('Не вдалося створити теку ' . IMPORTS_DIR);
    }
    $saved = IMPORTS_DIR . '/products_full-' . date('Y-m-d_His') . '.xml';
    write_atomic($saved, $text);
    @copy($saved, IMPORTS_DIR . '/products_full.xml');
    $copies = glob(IMPORTS_DIR . '/products_full-*.xml') ?: [];
    rsort($copies);
    foreach (array_slice($copies, KEEP_FEEDS) as $old) {
        @unlink($old);
    }
}

// Вивантаження з теки, куди 1С заливає файли по FTP (products_full.XML; регістр назви не важливий).
// Повертає [текст, час зміни файла]. Якщо файл щойно змінювався — чекає, поки 1С його доллє.
function read_local_feed(string $dir, bool $dry): array
{
    if (!is_dir($dir)) {
        throw new FeedError("Немає теки 1С $dir (або PHP не має до неї доступу)");
    }
    $path = null;
    foreach (scandir($dir) ?: [] as $name) {
        if (strcasecmp($name, 'products_full.xml') === 0) {
            $path = "$dir/$name";
            break;
        }
    }
    if ($path === null) {
        throw new FeedError("У теці 1С $dir немає products_full.XML");
    }
    for ($wait = 0; $wait < 10; $wait++) {
        clearstatcache(true, $path);
        $mtime = (int) @filemtime($path);
        if (time() - $mtime >= FEED_SETTLE_SEC) {
            break;
        }
        sleep(60);
    }
    $text = @file_get_contents($path);
    clearstatcache(true, $path);
    if ($text === false || trim($text) === '') {
        throw new FeedError("Файл $path порожній або не читається");
    }
    if ((int) @filemtime($path) !== $mtime) {
        throw new FeedError('Файл 1С змінювався під час читання — спробуйте пізніше');
    }
    if (!$dry) {
        save_feed_copy($text);
    }
    return [$text, $mtime];
}

// Фото з теки photo/ 1С → images_backup/ демосайту під назвою з каталогу (<код>-<N>.jpeg).
// 1С щоночі переливає всі фото, тому зміну видно лише за вмістом: sha1 оригіналу пишеться в
// api/data/photos.json, і фото переробляється, тільки коли оригінал інший.
// Оригіналу немає — лишається попереднє фото, а якщо й його немає — товар показується без фото.
function local_photos(array &$catalog, string $photoDir, bool $dry): array
{
    if (!is_dir($photoDir)) {
        throw new FeedError("Немає теки з фото $photoDir");
    }
    if (!$dry && !is_dir(IMAGES_DIR) && !@mkdir(IMAGES_DIR, 0755, true)) {
        throw new FeedError('Не вдалося створити теку ' . IMAGES_DIR);
    }
    $index = [];
    foreach (scandir($photoDir) ?: [] as $name) {
        if ($name[0] !== '.' && is_file("$photoDir/$name")) {
            $index[strtolower($name)] = $name;
        }
    }
    $manifest = read_json(PHOTO_MANIFEST) ?? [];
    $gd = function_exists('imagecreatefromstring') && function_exists('imagejpeg');
    $stats = ['total' => 0, 'present' => 0, 'converted' => 0, 'missing' => 0, 'keptOld' => 0, 'failed' => 0, 'deleted' => 0, 'gd' => $gd];
    $result = []; // назва фото → чи показувати його
    $newManifest = [];

    foreach ($catalog['products'] as &$p) {
        $kept = [];
        foreach ($p['images'] as $img) {
            if (strpos($img['url'], '/images_backup/') !== 0) {
                $kept[] = $img; // повна адреса прямо з вивантаження — лишаємо як є
                continue;
            }
            $file = substr($img['url'], strlen('/images_backup/'));
            if (!isset($result[$file])) {
                $stats['total']++;
                $result[$file] = false;
                $target = IMAGES_DIR . "/$file";
                $source = preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/D', $file) ? source_photo($index, $file) : null;
                if ($source === null) {
                    $stats['missing']++;
                    if (valid_image($target)) {
                        $stats['keptOld']++;
                        $result[$file] = true;
                        if (isset($manifest[$file])) {
                            $newManifest[$file] = $manifest[$file];
                        }
                    }
                } else {
                    // «-raw» — скопійоване без GD: коли GD з'явиться, фото переробиться
                    $hash = sha1_file("$photoDir/$source") . ($gd ? '' : '-raw');
                    if (($manifest[$file] ?? null) === $hash && valid_image($target)) {
                        $stats['present']++;
                        $result[$file] = true;
                        $newManifest[$file] = $hash;
                    } elseif ($dry) {
                        $stats['converted']++; // у перевірці — скільки треба оновити
                        $result[$file] = true;
                    } elseif (convert_photo("$photoDir/$source", "$target.tmp", $gd) && @rename("$target.tmp", $target)) {
                        $stats['converted']++;
                        $result[$file] = true;
                        $newManifest[$file] = $hash;
                    } else {
                        @unlink("$target.tmp");
                        $stats['failed']++;
                        $result[$file] = valid_image($target); // зіпсований оригінал — лишаємо попереднє
                    }
                }
            }
            if ($result[$file]) {
                $kept[] = $img;
            }
        }
        $p['images'] = $kept;
    }
    unset($p);

    // Фото товарів, яких більше немає у вивантаженні (і недороблені залишки)
    foreach (glob(IMAGES_DIR . '/*') ?: [] as $path) {
        if (is_file($path) && !isset($result[basename($path)])) {
            $stats['deleted']++;
            if (!$dry) {
                @unlink($path);
            }
        }
    }
    if (!$dry) {
        write_atomic(PHOTO_MANIFEST, json_out($newManifest));
    }
    return $stats;
}

// Оригінал у photo/: назва з вивантаження (00-…-1.jpg / .png / .jpeg), інакше та сама основа з іншим розширенням
function source_photo(array $index, string $file): ?string
{
    $candidates = [];
    $original = original_image($file);
    if ($original !== null) {
        $candidates[] = $original;
    }
    $base = preg_replace('/\.[A-Za-z]+$/D', '', $file);
    foreach (['jpg', 'jpeg', 'png', 'webp'] as $ext) {
        $candidates[] = "$base.$ext";
    }
    foreach ($candidates as $name) {
        if (preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/D', $name) && isset($index[strtolower($name)])) {
            return $index[strtolower($name)];
        }
    }
    return null;
}

// Як create-backup.php lvivimport.com (білий фон замість прозорого, JPEG), але зі зменшенням
// до PHOTO_MAX_SIDE і нормальною якістю. Без GD — копія оригіналу як є.
function convert_photo(string $source, string $target, bool $gd): bool
{
    if (filesize($source) > MAX_IMAGE_BYTES * 3) {
        return false;
    }
    if (!$gd) {
        return @copy($source, $target) && valid_image($target);
    }
    $image = @imagecreatefromstring((string) file_get_contents($source));
    if ($image === false) {
        return false;
    }
    $w = imagesx($image);
    $h = imagesy($image);
    $scale = min(1, PHOTO_MAX_SIDE / max($w, $h));
    $nw = max(1, (int) round($w * $scale));
    $nh = max(1, (int) round($h * $scale));
    $out = imagecreatetruecolor($nw, $nh);
    imagefill($out, 0, 0, imagecolorallocate($out, 255, 255, 255));
    imagealphablending($out, true);
    imagecopyresampled($out, $image, 0, 0, 0, 0, $nw, $nh, $w, $h);
    imagedestroy($image);
    imageinterlace($out, 1); // у PHP 7.4 параметр — int (strict_types не пропустить true)
    $ok = @imagejpeg($out, $target, PHOTO_QUALITY);
    imagedestroy($out);
    return $ok && valid_image($target);
}

// [успіх, помилка, чи варто повторити]: повтор лише при збої з'єднання, не при HTTP 4xx/5xx
function http_to_file(string $url, string $path, int $maxBytes, int $timeout): array
{
    $out = @fopen($path, 'wb');
    if (!$out) {
        return [false, "не вдалося записати $path", false];
    }
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        $size = 0;
        curl_setopt_array($ch, [
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_CONNECTTIMEOUT => 20,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_USERAGENT => USER_AGENT,
            CURLOPT_FAILONERROR => true,
            CURLOPT_WRITEFUNCTION => function ($ch, $chunk) use ($out, &$size, $maxBytes) {
                $size += strlen($chunk);
                return $size > $maxBytes ? 0 : fwrite($out, $chunk);
            },
        ]);
        $ok = curl_exec($ch) !== false;
        $errno = curl_errno($ch);
        $error = $size > $maxBytes ? 'файл завеликий' : curl_error($ch);
        $http = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        fclose($out);
        return [$ok, $error, !$ok && $http === 0 && $errno !== CURLE_WRITE_ERROR];
    }
    $in = @fopen($url, 'rb', false, stream_context_create(['http' => ['timeout' => $timeout, 'user_agent' => USER_AGENT]]));
    if (!$in) {
        fclose($out);
        return [false, "не вдалося відкрити посилання", true];
    }
    $copied = stream_copy_to_stream($in, $out, $maxBytes + 1);
    fclose($in);
    fclose($out);
    return $copied !== false && $copied <= $maxBytes ? [true, '', false] : [false, 'файл завеликий або обірвався', false];
}

// Фото з теки вивантаження → images_backup/ демосайту: наявні не качаються вдруге.
// Якщо в images_backup/ джерела фото немає, береться оригінал з сусідньої теки photo/
// (та сама назва, що у вивантаженні) і зберігається під звичною назвою .jpeg.
function localize_images(array &$catalog, string $imageBase, bool $dry): array
{
    if (!$dry && !is_dir(IMAGES_DIR) && !@mkdir(IMAGES_DIR, 0755, true)) {
        throw new FeedError('Не вдалося створити теку ' . IMAGES_DIR);
    }
    $photoBase = substr($imageBase, -strlen('images_backup/')) === 'images_backup/'
        ? substr($imageBase, 0, -strlen('images_backup/')) . 'photo/'
        : null;
    $stats = ['total' => 0, 'present' => 0, 'downloaded' => 0, 'fromPhoto' => 0, 'failed' => 0, 'deleted' => 0];
    $wanted = [];
    $failed = [];
    $requests = 0;
    foreach ($catalog['products'] as &$p) {
        foreach ($p['images'] as &$img) {
            if (strpos($img['url'], $imageBase) !== 0) {
                continue;
            }
            $file = rawurldecode(substr($img['url'], strlen($imageBase)));
            if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/D', $file)) {
                continue; // незвична назва — лишаємо посилання на джерело
            }
            if (!isset($wanted[$file])) {
                $wanted[$file] = true;
                $stats['total']++;
                if (valid_image(IMAGES_DIR . "/$file")) {
                    $stats['present']++;
                } elseif ($dry) {
                    $stats['downloaded']++; // у перевірці без змін — скільки треба докачати
                } else {
                    if ($requests++ > 0) {
                        usleep(IMAGE_PAUSE_US);
                    }
                    $tmp = IMAGES_DIR . "/$file.tmp";
                    [$ok] = http_to_file($img['url'], $tmp, MAX_IMAGE_BYTES, 60);
                    $ok = $ok && valid_image($tmp);
                    $original = original_image($file);
                    if (!$ok && $photoBase !== null && $original !== null && preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/D', $original)) {
                        usleep(IMAGE_PAUSE_US);
                        [$ok] = http_to_file($photoBase . $original, $tmp, MAX_IMAGE_BYTES, 60);
                        $ok = $ok && valid_image($tmp);
                        $stats['fromPhoto'] += $ok ? 1 : 0;
                    }
                    if ($ok && rename($tmp, IMAGES_DIR . "/$file")) {
                        $stats['downloaded']++;
                    } else {
                        @unlink($tmp);
                        $failed[$file] = true;
                    }
                }
            }
            // Не вдалося скачати — до наступного запуску фото показується з джерела
            if (!isset($failed[$file])) {
                $img['url'] = '/images_backup/' . $file;
            }
        }
        unset($img);
    }
    unset($p);
    $stats['failed'] = count($failed);

    // Фото товарів, яких більше немає у вивантаженні (і недокачані залишки)
    foreach (glob(IMAGES_DIR . '/*') ?: [] as $path) {
        $name = basename($path);
        if (is_file($path) && !isset($wanted[$name])) {
            $stats['deleted']++;
            if (!$dry) {
                @unlink($path);
            }
        }
    }
    return $stats;
}

function valid_image(string $path): bool
{
    return is_file($path) && filesize($path) > 0 && @getimagesize($path) !== false;
}

// Теки окремих сторінок товарів зі старих збірок: тепер товари показує шаблон product/index.html
function remove_old_product_dirs(bool $dry): int
{
    $count = 0;
    foreach (glob(ROOT . '/product/*', GLOB_ONLYDIR) ?: [] as $dir) {
        if (preg_match('/^[a-z0-9-]+$/D', basename($dir))) {
            $count++;
            if (!$dry) {
                remove_tree($dir);
            }
        }
    }
    return $count;
}

function remove_tree(string $dir): void
{
    foreach (scandir($dir) ?: [] as $name) {
        if ($name === '.' || $name === '..') {
            continue;
        }
        $path = "$dir/$name";
        is_dir($path) && !is_link($path) ? remove_tree($path) : @unlink($path);
    }
    @rmdir($dir);
}

// Як src/lib/sitemap-xml.ts (статична збірка, адреси зі скісною рискою)
function sitemap(array $products, string $site): string
{
    $base = rtrim($site, '/');
    $esc = function (string $s): string {
        return str_replace(['&', '<'], ['&amp;', '&lt;'], $s);
    };
    $rows = [];
    foreach (STATIC_PAGES as $p) {
        $rows[] = '  <url><loc>' . $esc($base . $p . ($p !== '' ? '/' : '')) . '</loc><changefreq>weekly</changefreq><priority>' . ($p === '' ? '1.0' : '0.7') . '</priority></url>';
    }
    foreach ($products as $p) {
        $rows[] = '  <url><loc>' . $esc("$base/product/{$p['slug']}/") . '</loc><changefreq>daily</changefreq><priority>0.6</priority></url>';
    }
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n" . implode("\n", $rows) . "\n</urlset>\n";
}

function json_out($data): string
{
    return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS | JSON_THROW_ON_ERROR);
}

function read_json(string $path): ?array
{
    if (!is_file($path)) {
        return null;
    }
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : null;
}

// Тимчасовий файл → rename: відвідувач ніколи не отримає напівзаписаний файл
function write_atomic(string $path, string $content): void
{
    if (!is_dir(dirname($path)) && !@mkdir(dirname($path), 0755, true)) {
        throw new RuntimeException('не вдалося створити теку ' . dirname($path));
    }
    $tmp = "$path.tmp";
    if (@file_put_contents($tmp, $content) !== strlen($content) || !@rename($tmp, $path)) {
        @unlink($tmp);
        throw new RuntimeException("не вдалося записати $path");
    }
}

// Публічний стан оновлення (без посилань і адрес) — його видно на /data/catalog-status.json
function write_status(array $status): void
{
    try {
        write_atomic(ROOT . '/data/catalog-status.json', json_out($status) . "\n");
    } catch (Throwable $e) {
        log_line('Не вдалося записати catalog-status.json: ' . $e->getMessage());
    }
}

function log_line(string $line): void
{
    @file_put_contents(DATA_DIR . '/catalog-update.log', '[' . date('Y-m-d H:i:s') . "] $line\n", FILE_APPEND | LOCK_EX);
}

function iso(DateTimeImmutable $t): string
{
    return $t->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
}

// Лист про збій — на ту саму адресу, що й заявки з форм (FORM_TO_EMAIL)
function notify(array $config, string $message, ?string $warning = null): void
{
    $to = (string) ($config['to'] ?? '');
    if ($to === '' || !function_exists('mail')) {
        return;
    }
    $host = (string) (parse_url((string) ($config['site'] ?? ''), PHP_URL_HOST) ?: 'demo.lvivimport.com');
    $demo = strpos($host, 'demo.') === 0;
    $from = (string) ($config['from'] ?? '');
    if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
        $from = "noreply@$host";
    }
    $enc = function (string $s): string {
        return '=?UTF-8?B?' . base64_encode($s) . '?=';
    };
    $headers = implode("\r\n", [
        'From: ' . $enc($demo ? 'Lviv Import — демосайт' : 'Lviv Import — сайт') . " <$from>",
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
    ]);
    $text = $warning !== null
        ? "Щоденне оновлення каталогу $host.\n\n$message\n\nЖурнал: public_html/api/data/catalog-update.log\n"
        : "Щоденне оновлення каталогу $host не вдалося.\n\n$message\n\nНа сайті лишився попередній каталог. Журнал: public_html/api/data/catalog-update.log\n";
    $subject = $enc($warning ?? ($demo ? 'Каталог демосайту не оновлено' : "Каталог $host не оновлено"));
    $body = chunk_split(base64_encode($text));
    @mail($to, $subject, $body, $headers, "-f$from") || @mail($to, $subject, $body, $headers);
}
