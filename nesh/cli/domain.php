<?php

require_once NESH_CLI . '/deployment.php';

use Nesh\Deployment;

$url = $argv[2] ?? '';

if ($url === '') {
    echo 'Usage: php nesh domain <URL>' . PHP_EOL;
    echo PHP_EOL;
    echo 'Examples:' . PHP_EOL;
    echo '  php nesh domain https://ielectro.com' . PHP_EOL;
    echo '  php nesh domain https://ielectro.altervista.org' . PHP_EOL;
    echo '  php nesh domain http://localhost/ielectro' . PHP_EOL;
    exit(1);
}

try {
    $deployment = new Deployment(ROOT_PATH);
    $result = $deployment->apply($url);
} catch (\InvalidArgumentException $exception) {
    echo 'Error: ' . $exception->getMessage() . PHP_EOL;
    exit(1);
} catch (\RuntimeException $exception) {
    echo 'Error: ' . $exception->getMessage() . PHP_EOL;
    exit(1);
}

echo 'Deployment: ' . $result['mode'] . PHP_EOL;
echo 'Base URL: ' . $result['base_url'] . PHP_EOL;
echo PHP_EOL;
echo 'Applications:' . PHP_EOL;
echo PHP_EOL;

$pad = max(array_map('strlen', Deployment::folders()));

foreach (Deployment::folders() as $folder) {
    echo str_pad($folder, $pad + 2)
        . $result['applications'][$folder]
        . PHP_EOL;
}

echo PHP_EOL;
echo 'Project files updated: ' . $result['files_updated'] . PHP_EOL;
echo 'URL replacements: ' . $result['replacements'] . PHP_EOL;
echo PHP_EOL;
echo 'Deployment completed successfully.' . PHP_EOL;
