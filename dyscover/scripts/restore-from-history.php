<?php
/**
 * Restore empty paragraph content from VS Code local history backups.
 * Keeps current file structure (template, headings); only fills empty <p class="paragraph">.
 */
$dir = __DIR__ . '/../assets/users/2/articles';
$history = 'C:/Users/disti/AppData/Roaming/Code/User/History';

$restores = [
    '9152da78-f7a6-4634-89a1-3bf506e1ca7a.html' => $history . '/-734e83bf/4wNs.php',
    '27f19d20-6045-4acd-8698-d87bcfde4595.html' => $history . '/3395038c/Mikl.php',
    'ad53ba91-7a81-4d91-b93a-3e0c3643b776.html' => $history . '/64a5446d/U3Hn.php',
    'e8718c83-6511-4dfa-adf9-7c3770da22cc.html' => $history . '/6b46dd2/v8r4.php',
];

function extractParagraphInners(string $html): array
{
    preg_match_all('/<p class="paragraph"[^>]*>(.*?)<\/p>/s', $html, $m);
    return $m[1] ?? [];
}

function isEmptyInner(string $inner): bool
{
    return trim(strip_tags(html_entity_decode($inner, ENT_QUOTES | ENT_HTML5, 'UTF-8'))) === '';
}

function restoreParagraphs(string $targetPath, string $backupPath): array
{
    if (!is_file($backupPath)) {
        return ['ok' => false, 'error' => "Backup missing: $backupPath"];
    }
    $backup = file_get_contents($backupPath);
    $backupParas = extractParagraphInners($backup);
    $backupParas = array_values(array_filter($backupParas, fn($p) => !isEmptyInner($p)));

    $html = file_get_contents($targetPath);
    $backupIndex = 0;
    $filled = 0;

    $result = preg_replace_callback('/(<p class="paragraph"[^>]*>)(.*?)(<\/p>)/s', function ($m) use (&$backupIndex, &$filled, $backupParas) {
        if (!isEmptyInner($m[2])) {
            return $m[0];
        }
        if (!isset($backupParas[$backupIndex])) {
            return $m[0];
        }
        $filled++;
        $inner = $backupParas[$backupIndex];
        $backupIndex++;
        return $m[1] . $inner . $m[3];
    }, $html);

    if ($result === null) {
        return ['ok' => false, 'error' => 'preg_replace failed'];
    }

    file_put_contents($targetPath, $result);

    return [
        'ok' => true,
        'filled' => $filled,
        'backup_paras' => count($backupParas),
        'unused_backup' => max(0, count($backupParas) - $backupIndex),
    ];
}

foreach ($restores as $name => $backup) {
    $path = $dir . '/' . $name;
    echo "$name\n";
    $r = restoreParagraphs($path, $backup);
    if (!$r['ok']) {
        echo "  ERROR: {$r['error']}\n";
        continue;
    }
    echo "  filled {$r['filled']} / {$r['backup_paras']} backup paragraphs\n";
    if ($r['unused_backup'] > 0) {
        echo "  WARNING: {$r['unused_backup']} backup paragraphs not used\n";
    }
}

// Verify
echo "\nVerification:\n";
foreach (array_keys($restores) as $name) {
    $path = $dir . '/' . $name;
    preg_match_all('/<p class="paragraph"[^>]*>(.*?)<\/p>/s', file_get_contents($path), $m);
    $empty = 0;
    $full = 0;
    foreach ($m[1] as $p) {
        if (isEmptyInner($p)) {
            $empty++;
        } else {
            $full++;
        }
    }
    echo "$name: $full filled, $empty still empty\n";
}
