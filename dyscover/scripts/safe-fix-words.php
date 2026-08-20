<?php
/**
 * Safe word-only fixes. Aborts file if any non-empty paragraph would become empty.
 */
$dir = __DIR__ . '/../assets/users/2/articles';
$files = glob($dir . '/*.html');

function countNonempty(string $html): int
{
    preg_match_all('/<p class="paragraph"[^>]*>(.*?)<\/p>/s', $html, $m);
    $n = 0;
    foreach ($m[1] as $p) {
        if (trim(strip_tags(html_entity_decode($p, ENT_QUOTES | ENT_HTML5, 'UTF-8'))) !== '') {
            $n++;
        }
    }
    return $n;
}

function fixInner(string $inner): string
{
    $pairs = [
        'ranking <b class="bold">second</b>' => 'among the leading economies',
        'ranking second' => 'ranking among the leading',
        'ranking <b class="bold">second globally</b>' => 'ranking among the leading economies globally',
        'ranking <b class="bold">13th in the world</b>' => 'ranking among the leading economies globally',
        'ranking <b class="bold">4th in the world by GDP' => 'ranking among the leading economies globally by GDP',
        'ranking <b class="bold">17th in the world</b>' => 'ranking among the leading economies globally',
        'one of the world&rsquo;s most influential nations' => 'among the most influential nations globally',
        'most technologically advanced economies in the world' => 'most technologically advanced economies globally',
        ' in the world</b>' => ' globally</b>',
        ', currently <b class="bold">Robert Whitaker</b>' => '',
        ' currently <b class="bold">Robert Whitaker</b>' => '',
    ];
    foreach ($pairs as $from => $to) {
        $inner = str_replace($from, $to, $inner);
    }
    // Named PM/President/King only when followed by name (two+ words), not "of"
    $inner = preg_replace(
        '/\b(King|Queen|President|Prime Minister|Chief Justice|Supreme Judge)\s+([A-Z][\w\'\-]+(?:\s+(?:[IVXLC]+|[A-Z][\w\'\-]+))+)\b(?!\s+of)/u',
        '$1',
        $inner
    ) ?? $inner;
    $inner = preg_replace('/\bformalized in <b class="bold">\d{4}<\/b>/i', 'formalized under the current constitutional framework', $inner) ?? $inner;
    $inner = preg_replace('/\bestablished in <b class="bold">\d{4}<\/b>/i', 'established under the current framework', $inner) ?? $inner;
    $inner = preg_replace('/\bin <b class="bold">\d{4}<\/b>/i', 'under the established framework', $inner) ?? $inner;
    return $inner;
}

$total = 0;
foreach ($files as $path) {
    $html = file_get_contents($path);
    $before = countNonempty($html);
    $parts = preg_split('/(<table class="template">.*?<\/table>)/s', $html, -1, PREG_SPLIT_DELIM_CAPTURE);
    if ($parts === false) {
        continue;
    }
    for ($i = 0; $i < count($parts); $i++) {
        if (str_starts_with($parts[$i], '<table class="template">')) {
            continue;
        }
        $parts[$i] = preg_replace_callback('/(<p class="paragraph"[^>]*>)(.*?)(<\/p>)/s', function ($m) {
            return $m[1] . fixInner($m[2]) . $m[3];
        }, $parts[$i]) ?? $parts[$i];
    }
    $out = implode('', $parts);
    $after = countNonempty($out);
    if ($after < $before) {
        echo 'SKIP ' . basename($path) . " (would lose paragraphs: $before -> $after)\n";
        continue;
    }
    if ($out !== $html) {
        file_put_contents($path, $out);
        echo 'OK ' . basename($path) . "\n";
        $total++;
    }
}
echo "Updated $total files\n";
