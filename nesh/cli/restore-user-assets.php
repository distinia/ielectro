<?php
$root = dirname(__DIR__, 2);
$historyRoots = [
    getenv('APPDATA') . '/Code/User/History',
    getenv('APPDATA') . '/Cursor/User/History',
];
$manualBackups = [
    '2/articles/27f19d20-6045-4acd-8698-d87bcfde4595.html' => getenv('APPDATA') . '/Code/User/History/3395038c/Mikl.php',
    '2/articles/ad53ba91-7a81-4d91-b93a-3e0c3643b776.html' => getenv('APPDATA') . '/Code/User/History/64a5446d/U3Hn.php',
    '2/articles/e8718c83-6511-4dfa-adf9-7c3770da22cc.html' => getenv('APPDATA') . '/Code/User/History/6b46dd2/v8r4.php',
    '2/articles/9152da78-f7a6-4634-89a1-3bf506e1ca7a.html' => getenv('APPDATA') . '/Code/User/History/-734e83bf/4wNs.php',
];
$targetPrefix = str_replace('\\', '/', $root . '/dyscover/assets/users/');
$restored = [];
$skipped = 0;
foreach ($historyRoots as $historyRoot) {
    if (!is_dir($historyRoot)) {
        continue;
    }
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($historyRoot, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterator as $file) {
        if ($file->getFilename() !== 'entries.json') {
            continue;
        }
        $meta = json_decode(file_get_contents($file->getPathname()), true);
        if (!is_array($meta)) {
            continue;
        }
        $resource = (string) ($meta['resource'] ?? '');
        if ($resource === '') {
            continue;
        }
        $path = urldecode(preg_replace('#^file:///+#i', '', $resource) ?? '');
        $path = strtolower(str_replace('\\', '/', $path));
        $prefix = strtolower($targetPrefix);
        if (!str_starts_with($path, $prefix)) {
            continue;
        }
        $entries = $meta['entries'] ?? [];
        if (!is_array($entries) || $entries === []) {
            continue;
        }
        usort($entries, static fn(array $a, array $b): int => ($b['timestamp'] ?? 0) <=> ($a['timestamp'] ?? 0));
        $latest = $entries[0];
        $backup = $file->getPath() . DIRECTORY_SEPARATOR . ($latest['id'] ?? '');
        if (!is_file($backup)) {
            $skipped++;
            continue;
        }
        $relative = substr($path, strlen($prefix));
        $target = $root . '/dyscover/assets/users/' . str_replace('\\', '/', $relative);
        $key = str_replace('\\', '/', $relative);
        $timestamp = (int) ($latest['timestamp'] ?? 0);
        if (isset($restored[$key]) && $restored[$key]['timestamp'] >= $timestamp) {
            continue;
        }
        $restored[$key] = [
            'source' => $backup,
            'target' => $target,
            'timestamp' => $timestamp,
        ];
    }
}
foreach ($manualBackups as $relative => $backup) {
    $relative = str_replace('\\', '/', $relative);
    if (!is_file($backup)) {
        $skipped++;
        continue;
    }
    $target = $root . '/dyscover/assets/users/' . $relative;
    $timestamp = (int) (@filemtime($backup) ?: 0);
    if (isset($restored[$relative]) && $restored[$relative]['timestamp'] >= $timestamp) {
        continue;
    }
    $restored[$relative] = [
        'source' => $backup,
        'target' => $target,
        'timestamp' => $timestamp,
    ];
}
$userDirs = ['1', '2'];
$subDirs = ['articles', 'images', 'videos', 'audios', 'documents', 'templates'];
foreach ($userDirs as $userId) {
    foreach ($subDirs as $subDir) {
        $directory = $root . '/dyscover/assets/users/' . $userId . '/' . $subDir;
        if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
            fwrite(STDERR, 'Unable to create directory: ' . $directory . PHP_EOL);
        }
    }
}
ksort($restored);
$written = 0;
foreach ($restored as $item) {
    $directory = dirname($item['target']);
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        fwrite(STDERR, 'Unable to create directory: ' . $directory . PHP_EOL);
        continue;
    }
    if (!copy($item['source'], $item['target'])) {
        fwrite(STDERR, 'Unable to restore: ' . $item['target'] . PHP_EOL);
        continue;
    }
    $written++;
}
echo 'Restored files: ' . $written . PHP_EOL;
echo 'Skipped missing backups: ' . $skipped . PHP_EOL;
foreach (['1', '2'] as $userId) {
    $base = $root . '/dyscover/assets/users/' . $userId;
    if (!is_dir($base)) {
        echo 'User ' . $userId . ': missing folder' . PHP_EOL;
        continue;
    }
    $count = iterator_count(new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS)
    ));
    echo 'User ' . $userId . ': ' . $count . ' files' . PHP_EOL;
}
