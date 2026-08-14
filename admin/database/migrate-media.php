<?php
/**
 * Move legacy admin/content/* files into assets paths.
 * Run once: php admin/database/migrate-media.php
 */
declare(strict_types=1);

$root = dirname(__DIR__, 2);
require_once $root . '/nesh/src/autoload.php';
require_once $root . '/admin/api/paths.php';

if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', $root);
}

$moves = [
    [$root . '/admin/content/news', Admin\MediaPaths::newsDir()],
    [$root . '/admin/content/applications', Admin\MediaPaths::applicationsDir()],
];

foreach ($moves as [$from, $to]) {
    if (!is_dir($from)) {
        echo "[SKIP] {$from}\n";
        continue;
    }
    \Nesh\File::makeDirectory($to);
    $count = 0;
    foreach (glob($from . '/*') ?: [] as $file) {
        if (!is_file($file)) {
            continue;
        }
        $target = $to . '/' . basename($file);
        if (is_file($target)) {
            continue;
        }
        if (copy($file, $target)) {
            $count++;
        }
    }
    echo "[OK] Copied {$count} files from {$from} to {$to}\n";
}

echo "=== Done ===\n";
