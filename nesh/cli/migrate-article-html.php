<?php

use Nesh\App;
use Dyscover\PostAssets;

global $argv;

$userId = (int) ($argv[2] ?? 0);
if ($userId <= 0) {
    echo 'Usage: php nesh migrate-article-html <user_id>' . PHP_EOL;
    exit(1);
}

$app = App::get('dyscover');
if ($app === null) {
    echo 'Dyscover application is not configured.' . PHP_EOL;
    exit(1);
}

$roots = [
    $app->paths['assets'] . '/users/' . $userId . '/article',
    $app->paths['assets'] . '/users/' . $userId . '/articles',
];

$stats = ['files' => 0, 'updated' => 0];

foreach ($roots as $dir) {
    if (!is_dir($dir)) {
        continue;
    }
    foreach (glob($dir . '/*.html') ?: [] as $file) {
        $stats['files']++;
        $original = (string) file_get_contents($file);
        $updated = PostAssets::normalizeArticleHtml($original);
        if ($updated !== $original) {
            file_put_contents($file, $updated);
            $stats['updated']++;
        }
    }
}

echo 'Article HTML cleanup completed.' . PHP_EOL;
echo '  Files scanned: ' . $stats['files'] . PHP_EOL;
echo '  Files updated: ' . $stats['updated'] . PHP_EOL;
