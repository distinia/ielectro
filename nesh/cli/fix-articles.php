<?php

use Dyscover\PostAssets;
use Nesh\App;
use Nesh\Query;

global $argv;

$userId = (int) ($argv[2] ?? 0);
if ($userId <= 0) {
    echo 'Usage: php nesh fix-articles <user_id>' . PHP_EOL;
    exit(1);
}

$app = App::get('dyscover');
if ($app === null) {
    echo 'Dyscover application is not configured.' . PHP_EOL;
    exit(1);
}

if (!defined('APP_URL')) {
    define('APP_URL', $app->url);
}

$articlesDir = $app->paths['assets'] . '/users/' . $userId . '/articles';
if (!is_dir($articlesDir)) {
    echo "Articles directory not found: {$articlesDir}" . PHP_EOL;
    exit(1);
}

$map = buildAssetMap($userId);
$articleMap = buildArticleMap($userId);
$templateMap = buildTemplateMap($userId);

$files = glob($articlesDir . '/*.html') ?: [];
$stats = [
    'files' => 0,
    'sections_removed' => 0,
    'titles_removed' => 0,
    'urls_replaced' => 0,
    'urls_unresolved' => 0,
    'templates_fixed' => 0,
    'templates_missing' => 0,
    'preview_images_updated' => 0,
    'preview_images_missing' => 0,
];

foreach ($files as $file) {
    $original = (string) file_get_contents($file);
    $updated = $original;

    [$updated, $sectionRemoved] = removeContentSection($updated);
    [$updated, $titleRemoved] = removeTitleHeading($updated);
    [$updated, $replaced, $unresolved] = replaceUrls($updated, $map, $articleMap, $userId);
    [$updated, $templatesFixed, $templatesMissing] = fixTemplateAttributes($updated, $templateMap);

    if ($updated !== $original) {
        file_put_contents($file, $updated);
    }

    $stats['files']++;
    $stats['sections_removed'] += $sectionRemoved;
    $stats['titles_removed'] += $titleRemoved;
    $stats['urls_replaced'] += $replaced;
    $stats['urls_unresolved'] += $unresolved;
    $stats['templates_fixed'] += $templatesFixed;
    $stats['templates_missing'] += $templatesMissing;
}

[$previewUpdated, $previewMissing] = syncPreviewImages($userId, $files);
$stats['preview_images_updated'] = $previewUpdated;
$stats['preview_images_missing'] = $previewMissing;

echo 'Article cleanup completed.' . PHP_EOL;
echo '  Files processed: ' . $stats['files'] . PHP_EOL;
echo '  Sections removed: ' . $stats['sections_removed'] . PHP_EOL;
echo '  Titles removed: ' . $stats['titles_removed'] . PHP_EOL;
echo '  URLs replaced: ' . $stats['urls_replaced'] . PHP_EOL;
echo '  URLs unresolved: ' . $stats['urls_unresolved'] . PHP_EOL;
echo '  Template attributes fixed: ' . $stats['templates_fixed'] . PHP_EOL;
echo '  Template attributes unresolved: ' . $stats['templates_missing'] . PHP_EOL;
echo '  Preview images updated: ' . $stats['preview_images_updated'] . PHP_EOL;
echo '  Preview images missing: ' . $stats['preview_images_missing'] . PHP_EOL;

function syncPreviewImages(int $userId, array $files): array
{
    require_once dirname(__DIR__, 2) . '/dyscover/api/article-content.php';

    $updated = 0;
    $missing = 0;

    foreach ($files as $file) {
        $basename = basename($file, '.html');
        if (!preg_match('/^[0-9a-f-]{36}$/i', $basename)) {
            continue;
        }
        $html = (string) file_get_contents($file);
        $cover = \Dyscover\ArticleContent::extractCoverImage($html);
        if ($cover === '') {
            $missing++;
            continue;
        }
        $rows = Query::execute(
            'UPDATE ielectro_dyscover.dyscover_posts
            SET preview_image = ?
            WHERE user_id = ?
            AND uuid = ?
            AND type = \'article\'',
            [$cover, $userId, strtolower($basename)]
        );
        if ($rows > 0) {
            $updated++;
        } else {
            $missing++;
        }
    }

    return [$updated, $missing];
}

function buildTemplateMap(int $userId): array
{
    $rows = Query::fetchAll(
        "SELECT id, title
        FROM ielectro_dyscover.dyscover_posts
        WHERE user_id = ?
        AND type = 'template'
        AND status IN ('active', 'hidden')",
        [$userId]
    );

    $map = [];
    foreach ($rows as $row) {
        $key = strtolower(trim((string) $row['title']));
        if ($key === '') {
            continue;
        }
        $map[$key] = (int) $row['id'];
    }

    return $map;
}

function fixTemplateAttributes(string $html, array $templateMap): array
{
    $fixed = 0;
    $missing = 0;

    $html = preg_replace_callback(
        '/\sdata-title="([^"]+)"/i',
        static function (array $matches) use ($templateMap, &$fixed, &$missing): string {
            $key = strtolower(trim($matches[1]));
            if ($key === '' || !isset($templateMap[$key])) {
                $missing++;
                return $matches[0];
            }

            $fixed++;
            return ' data-template="' . $templateMap[$key] . '"';
        },
        $html
    ) ?? $html;

    return [$html, $fixed, $missing];
}

function buildAssetMap(int $userId): array
{
    $rows = Query::fetchAll(
        "SELECT uuid, type, extension, title
        FROM ielectro_dyscover.dyscover_posts
        WHERE user_id = ?
        AND type IN ('image', 'video', 'audio', 'document')
        AND status IN ('active', 'hidden')",
        [$userId]
    );

    $map = [];
    foreach ($rows as $row) {
        $legacy = legacyBasename((string) $row['title']);
        $extension = strtolower(ltrim((string) ($row['extension'] ?? ''), '.'));
        if ($legacy === '' || $extension === '') {
            continue;
        }

        $folder = PostAssets::assetFolder((string) $row['type']);
        $url = APP_URL
            . '/assets/users/' . $userId
            . '/' . $folder
            . '/' . $row['uuid']
            . '.' . $extension;

        foreach (legacyFilenameVariants($legacy, $extension) as $key) {
            $map[$key] = $url;
            $map[strtolower($key)] = $url;
        }
    }

    return $map;
}

function buildArticleMap(int $userId): array
{
    $rows = Query::fetchAll(
        "SELECT uuid, title
        FROM ielectro_dyscover.dyscover_posts
        WHERE user_id = ?
        AND type = 'article'
        AND status IN ('active', 'hidden')",
        [$userId]
    );

    $map = [];
    foreach ($rows as $row) {
        $title = trim((string) $row['title']);
        $legacy = legacyBasename($title);
        if ($legacy === '') {
            continue;
        }

        $url = APP_URL . '/article/' . $row['uuid'];
        $keys = array_merge(
            legacySlugVariants($legacy),
            [$title, str_replace('_', ' ', $legacy)]
        );
        foreach ($keys as $key) {
            $map[$key] = $url;
            $map[strtolower($key)] = $url;
            $map[rawurlencode($key)] = $url;
        }
    }

    return $map;
}

function legacyBasename(string $title): string
{
    $title = trim($title);
    $title = preg_replace('/\s+/', ' ', $title) ?? $title;
    return str_replace(' ', '_', $title);
}

function legacySlugVariants(string $legacy): array
{
    return array_values(array_unique([
        $legacy,
        str_replace('_', '-', $legacy),
        str_replace('-', '_', $legacy),
    ]));
}

function stripUnresolvedArticleLinks(
    string $html,
    array $articleMap,
    int $userId,
    int &$unresolved
): array {
    $stripped = 0;
    $html = preg_replace_callback(
        '~<a\b([^>]*?)href="https://dyscover\.ielectro\.com/article/([^"\'<>?]+)"([^>]*)>(.*?)</a>~is',
        static function (array $matches) use ($articleMap, $userId, &$unresolved, &$stripped): string {
            $slug = rawurldecode($matches[2]);
            $replacedCount = 0;
            $localUnresolved = 0;
            $resolved = resolveArticleUrl(
                $slug,
                $articleMap,
                $userId,
                $replacedCount,
                $localUnresolved
            );
            if ($resolved !== null) {
                return $matches[0];
            }
            $unresolved++;
            $stripped++;
            return $matches[4];
        },
        $html
    ) ?? $html;

    return [$html, $stripped];
}

function resolveArticleUrl(
    string $slug,
    array $articleMap,
    int $userId,
    int &$replaced,
    int &$unresolved
): ?string {
    $fragment = '';
    if (str_contains($slug, '#')) {
        [$slug, $fragment] = explode('#', $slug, 2);
    }

    $slug = rawurldecode($slug);
    $slug = preg_replace('/\.(php|html)$/i', '', $slug) ?? $slug;

    if (\Nesh\Validate::uuid(strtolower($slug))) {
        $url = APP_URL . '/article/' . strtolower($slug);
        if ($fragment !== '') {
            $url .= '#' . $fragment;
        }
        return $url;
    }

    foreach (legacySlugVariants(str_replace('-', '_', $slug)) as $key) {
        if (isset($articleMap[$key])) {
            $replaced++;
            $url = $articleMap[$key];
            if ($fragment !== '') {
                $url .= '#' . $fragment;
            }
            return $url;
        }
        if (isset($articleMap[strtolower($key)])) {
            $replaced++;
            $url = $articleMap[strtolower($key)];
            if ($fragment !== '') {
                $url .= '#' . $fragment;
            }
            return $url;
        }
    }

    $titleGuess = str_replace(['_', '-'], ' ', $slug);
    $row = Query::fetch(
        "SELECT uuid
        FROM ielectro_dyscover.dyscover_posts
        WHERE user_id = ?
        AND type = 'article'
        AND status IN ('active', 'hidden')
        AND (
            LOWER(title) = LOWER(?)
            OR LOWER(REPLACE(title, ' ', '_')) = LOWER(?)
            OR LOWER(REPLACE(title, ' ', '-')) = LOWER(?)
        )
        LIMIT 1",
        [$userId, $titleGuess, str_replace('-', '_', $slug), str_replace('_', '-', $slug)]
    );
    if ($row && !empty($row['uuid'])) {
        $replaced++;
        $url = APP_URL . '/article/' . $row['uuid'];
        if ($fragment !== '') {
            $url .= '#' . $fragment;
        }
        return $url;
    }

    $unresolved++;
    return null;
}

function legacyFilenameVariants(string $legacy, string $extension): array
{
    $filename = $legacy . '.' . $extension;
    $variants = [$filename, str_replace('_', '-', $legacy) . '.' . $extension];

    if (preg_match('/^(.*)_(\d+)$/', $legacy, $matches)) {
        $variants[] = $matches[1] . '.' . $extension;
        $variants[] = $matches[1] . '_' . $matches[2] . '.' . $extension;
    }

    return array_values(array_unique($variants));
}

function legacyLookupKeys(string $filename): array
{
    $basename = pathinfo($filename, PATHINFO_FILENAME);
    $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $normalized = str_replace('-', '_', $basename);
    $keys = legacyFilenameVariants($normalized, $extension);
    $keys[] = str_replace('_', '-', $normalized) . '.' . $extension;

    if (preg_match('/^(.*)_(\d+)$/', $normalized, $matches)) {
        $keys[] = $matches[1] . '.' . $extension;
    }

    return array_values(array_unique(array_map('strtolower', $keys)));
}

function removeContentSection(string $html): array
{
    $removed = 0;
    $pattern = '/\s*<section\s+class="content"\s*>\s*/i';
    if (preg_match($pattern, $html)) {
        $html = preg_replace($pattern, '', $html, 1, $count) ?? $html;
        $removed = (int) $count;
    }

    $html = preg_replace('/\s*<\/section>\s*$/', '', $html, 1) ?? $html;

    return [trim($html), $removed];
}

function removeTitleHeading(string $html): array
{
    $removed = 0;
    $pattern = '/\s*<h1\s+class="title"[^>]*>.*?<\/h1>\s*/is';
    $html = preg_replace($pattern, '', $html, 1, $count) ?? $html;
    $removed = (int) $count;

    return [trim($html), $removed];
}

function replaceUrls(string $html, array $map, array $articleMap, int $userId): array
{
    $replaced = 0;
    $unresolved = 0;

    $html = preg_replace_callback(
        '#https://dyscover\.ielectro\.com/content/(image|audio|video|document)/([^"\s>?]+)(?:\?[^"\s>]*)?#i',
        function (array $matches) use ($map, &$replaced, &$unresolved): string {
            $filename = rawurldecode($matches[2]);
            $candidates = legacyLookupKeys($filename);

            foreach ($candidates as $key) {
                if (isset($map[$key])) {
                    $replaced++;
                    return $map[$key];
                }
            }

            $unresolved++;
            return $matches[0];
        },
        $html,
        -1,
        $mediaCount
    ) ?? $html;

    $html = preg_replace_callback(
        '#https://dyscover\.ielectro\.com/content/article/([^"\s>?]+?)(?:\.(?:php|html))?(?:\?[^"\s>]*)?#i',
        function (array $matches) use ($articleMap, $userId, &$replaced, &$unresolved): string {
            return resolveArticleUrl($matches[1], $articleMap, $userId, $replaced, $unresolved)
                ?? $matches[0];
        },
        $html
    ) ?? $html;

    $html = preg_replace_callback(
        '~https://dyscover\.ielectro\.com/article/([^"\'<>?]+)~i',
        function (array $matches) use ($articleMap, $userId, &$replaced, &$unresolved): string {
            $slug = rawurldecode($matches[1]);
            if (\Nesh\Validate::uuid(strtolower(strtok($slug, '#') ?: $slug))) {
                return $matches[0];
            }

            return resolveArticleUrl($slug, $articleMap, $userId, $replaced, $unresolved)
                ?? $matches[0];
        },
        $html
    ) ?? $html;

    [$html, $stripped] = stripUnresolvedArticleLinks($html, $articleMap, $userId, $unresolved);
    $replaced += $stripped;

    $html = preg_replace_callback(
        '#https://dyscover\.ielectro\.com/assets/users/' . $userId . '/(images|videos|audios|documents)/([0-9a-f-]{36})_([^"\s>?]+?)(?:\?[^"\s>]*)?#i',
        function (array $matches) use ($userId, &$replaced): string {
            $replaced++;
            return APP_URL
                . '/assets/users/' . $userId
                . '/' . $matches[1]
                . '/' . $matches[2]
                . '.' . pathinfo($matches[3], PATHINFO_EXTENSION);
        },
        $html
    ) ?? $html;

    return [$html, $replaced, $unresolved];
}
