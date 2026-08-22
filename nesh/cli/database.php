<?php
use Nesh\DatabaseCli;
use Nesh\Deployment;
$application = $argv[2] ?? '';
$newDatabase = $argv[3] ?? '';
$url = $argv[4] ?? '';
if (
    $application === ''
    || $application === '--help'
    || $application === '-h'
) {
    echo 'Usage: php nesh database <application> <database> <URL>' . PHP_EOL;
    echo PHP_EOL;
    echo 'Renames one application database inside an existing deployment folder.' . PHP_EOL;
    echo 'The deployment folder is resolved from the URL domain.' . PHP_EOL;
    echo PHP_EOL;
    echo 'Examples:' . PHP_EOL;
    echo '  php nesh database account new_account https://ielectro.example.it' . PHP_EOL;
    echo '  php nesh database dyscover my_dyscover https://ielectro.altervista.org' . PHP_EOL;
    exit($application === '' ? 1 : 0);
}
if ($newDatabase === '' || $url === '') {
    echo 'Error: Missing application, database name, or deployment URL.' . PHP_EOL;
    exit(1);
}
try {
    $deploymentRoot = Deployment::pathFromUrl($url);
    if (!is_dir($deploymentRoot)) {
        throw new \InvalidArgumentException(
            'Deployment folder not found: ' . $deploymentRoot
        );
    }
    $cli = new DatabaseCli($deploymentRoot);
    $result = $cli->applyOne($application, $newDatabase);
    $deployment = new Deployment($deploymentRoot);
    $sqlResult = $deployment->buildUnifiedSql();
} catch (\InvalidArgumentException $exception) {
    echo 'Error: ' . $exception->getMessage() . PHP_EOL;
    exit(1);
} catch (\RuntimeException $exception) {
    echo 'Error: ' . $exception->getMessage() . PHP_EOL;
    exit(1);
}
echo 'Deployment: ' . $deploymentRoot . PHP_EOL;
echo PHP_EOL;
if ($result['unchanged']) {
    echo 'No change required.' . PHP_EOL;
} else {
    $migration = $result['migrations'][0];
    echo 'Application: ' . $migration['name'] . PHP_EOL;
    echo 'Database: ' . $migration['from'] . ' -> ' . $migration['to'] . PHP_EOL;
    echo PHP_EOL;
    echo 'Updated:' . PHP_EOL;
    if ($result['updated']['autoload']) {
        echo '- autoload.php' . PHP_EOL;
    }
    if ($result['updated']['schema']) {
        echo '- schema.php' . PHP_EOL;
    }
    if ($result['updated']['php'] > 0) {
        echo '- ' . $result['updated']['php'] . ' PHP files' . PHP_EOL;
    }
    if ($result['updated']['sql'] > 0) {
        echo '- ' . $result['updated']['sql'] . ' SQL files' . PHP_EOL;
    }
    if ($result['updated']['other'] > 0) {
        echo '- ' . $result['updated']['other'] . ' other files' . PHP_EOL;
    }
}
echo PHP_EOL;
echo 'Unified SQL: ' . $sqlResult['path'] . PHP_EOL;
echo PHP_EOL;
echo 'Done.' . PHP_EOL;
