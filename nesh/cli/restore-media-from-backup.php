<?php
require_once __DIR__ . '/../src/autoload.php';

use Nesh\Query;

$source = $argv[1] ?? '';
if ($source === '' || $source === '--help' || $source === '-h') {
    echo 'Usage: php nesh/cli/restore-media-from-backup.php <backup-path> [user-id]' . PHP_EOL;
    echo PHP_EOL;
    echo 'Examples:' . PHP_EOL;
    echo '  php nesh/cli/restore-media-from-backup.php D:/backup/dyscover/assets/users' . PHP_EOL;
    echo '  php nesh/cli/restore-media-from-backup.php D:/ielectro.zip 2' . PHP_EOL;
    exit($source === '' ? 1 : 0);
}

$userId = (int) ($argv[2] ?? 2);
if ($userId < 1) {
    fwrite(STDERR, 'Invalid user id.' . PHP_EOL);
    exit(1);
}

$root = dirname(__DIR__, 2);
$targetRoot = $root . '/dyscover/assets/users/' . $userId;
$folders = [
    'article' => 'articles',
    'image' => 'images',
    'video' => 'videos',
    'audio' => 'audios',
    'document' => 'documents',
    'template' => 'templates',
];

function assetFileName(array $post): string
{
    $uuid = $post['uuid'];
    if ($post['type'] === 'article' || $post['type'] === 'template') {
        return $uuid . '.html';
    }
    return $uuid . '.' . ltrim((string) ($post['extension'] ?? ''), '.');
}

function findInTree(string $base, string $fileName): ?string
{
    if (!is_dir($base)) {
        return null;
    }
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterator as $file) {
        if ($file->isFile() && strcasecmp($file->getFilename(), $fileName) === 0) {
            return $file->getPathname();
        }
    }
    return null;
}

function withZip(string $zipPath, callable $callback): void
{
    if (!class_exists(ZipArchive::class)) {
        throw new RuntimeException('ZipArchive is not available.');
    }
    $zip = new ZipArchive();
    if ($zip->open($zipPath) !== true) {
        throw new RuntimeException('Unable to open zip: ' . $zipPath);
    }
    try {
        $callback($zip);
    } finally {
        $zip->close();
    }
}

function findInZip(ZipArchive $zip, string $fileName): ?string
{
    for ($index = 0; $index < $zip->numFiles; $index++) {
        $name = $zip->getNameIndex($index);
        if (!is_string($name) || str_ends_with($name, '/')) {
            continue;
        }
        if (strcasecmp(basename($name), $fileName) === 0) {
            return $name;
        }
    }
    return null;
}

$posts = Query::fetchAll(
    "SELECT uuid, type, extension
     FROM ielectro_dyscover.dyscover_posts
     WHERE user_id = ? AND status = 'active'
     ORDER BY type, uuid",
    [$userId]
);

$copied = 0;
$already = 0;
$missing = 0;
$isZip = is_file($source) && preg_match('/\.zip$/i', $source);

foreach ($posts as $post) {
    $folder = $folders[$post['type']] ?? $post['type'];
    $fileName = assetFileName($post);
    $targetDir = $targetRoot . '/' . $folder;
    $target = $targetDir . '/' . $fileName;

    if (is_file($target)) {
        $already++;
        continue;
    }

    if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true) && !is_dir($targetDir)) {
        fwrite(STDERR, 'Unable to create directory: ' . $targetDir . PHP_EOL);
        $missing++;
        continue;
    }

    if ($isZip) {
        withZip($source, function (ZipArchive $zip) use (
            $fileName,
            $target,
            &$copied,
            &$missing
        ): void {
            $entry = findInZip($zip, $fileName);
            if ($entry === null) {
                $missing++;
                return;
            }
            $contents = $zip->getFromName($entry);
            if ($contents === false || file_put_contents($target, $contents) === false) {
                fwrite(STDERR, 'Unable to restore: ' . $target . PHP_EOL);
                $missing++;
                return;
            }
            $copied++;
        });
        continue;
    }

    $match = findInTree($source, $fileName);
    if ($match === null) {
        $missing++;
        continue;
    }
    if (!copy($match, $target)) {
        fwrite(STDERR, 'Unable to restore: ' . $target . PHP_EOL);
        $missing++;
        continue;
    }
    $copied++;
}

echo 'User ' . $userId . PHP_EOL;
echo 'Already present: ' . $already . PHP_EOL;
echo 'Restored: ' . $copied . PHP_EOL;
echo 'Still missing: ' . $missing . PHP_EOL;
