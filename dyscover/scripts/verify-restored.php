<?php
$files = [
    '9152da78-f7a6-4634-89a1-3bf506e1ca7a',
    '27f19d20-6045-4acd-8698-d87bcfde4595',
    'ad53ba91-7a81-4d91-b93a-3e0c3643b776',
    'e8718c83-6511-4dfa-adf9-7c3770da22cc',
    'a5d2faea-c96e-4894-b2ff-68a543e6ce3a',
];
$dir = __DIR__ . '/../assets/users/2/articles';
foreach ($files as $f) {
    $path = "$dir/$f.html";
    $h = file_get_contents($path);
    preg_match_all('/<p class="paragraph"[^>]*>(.*?)<\/p>/s', $h, $m);
    $e = 0;
    $n = 0;
    foreach ($m[1] as $p) {
        if (trim(strip_tags($p))) {
            $n++;
        } else {
            $e++;
        }
    }
    echo "$f: $n filled, $e empty, " . strlen($h) . " bytes\n";
}
