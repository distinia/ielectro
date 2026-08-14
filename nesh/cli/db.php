<?php
require_once NESH_CLI . '/database-cli.php';
use Nesh\DatabaseCli;
$arg1 = $argv[2] ?? '';
$arg2 = $argv[3] ?? '';
if ($arg1 === '' || $arg1 === '--help' || $arg1 === '-h') {
    echo 'Usage:' . PHP_EOL;
    echo '  php nesh db --all <database>' . PHP_EOL;
    echo '  php nesh db <application> <database>' . PHP_EOL;
    echo PHP_EOL;
    echo 'Examples:' . PHP_EOL;
    echo '  php nesh db --all my_ielectro' . PHP_EOL;
    echo '  php nesh db account ielectro_new_account' . PHP_EOL;
    echo '  php nesh db dyscover ielectro_new_dyscover_db' . PHP_EOL;
    exit($arg1 === '' ? 1 : 0);
}
try {
    $cli = new DatabaseCli(ROOT_PATH);
    if ($arg1 === '--all') {
        if ($arg2 === '') {
            echo 'Error: Missing database name.' . PHP_EOL;
            exit(1);
        }
        $result = $cli->applyAll($arg2);
    } else {
        if ($arg2 === '') {
            echo 'Error: Missing database name.' . PHP_EOL;
            exit(1);
        }
        $result = $cli->applyOne($arg1, $arg2);
    }
} catch (\InvalidArgumentException $exception) {
    echo 'Error: ' . $exception->getMessage() . PHP_EOL;
    exit(1);
} catch (\RuntimeException $exception) {
    echo 'Error: ' . $exception->getMessage() . PHP_EOL;
    exit(1);
}
if ($result['unchanged']) {
    echo 'No change required.' . PHP_EOL;
    if ($result['all']) {
        echo 'All applicable applications already use: '
            . $result['new_database']
            . PHP_EOL;
    } else {
        $migration = $result['migrations'][0];
        echo 'Application: ' . $migration['name'] . PHP_EOL;
        echo 'Database: ' . $migration['from'] . PHP_EOL;
    }
    exit(0);
}
if ($result['all']) {
    echo 'Applications: '
        . implode(', ', array_column($result['migrations'], 'folder'))
        . PHP_EOL;
    echo 'New database: ' . $result['new_database'] . PHP_EOL;
} else {
    $migration = $result['migrations'][0];
    echo 'Application: ' . $migration['name'] . PHP_EOL;
    echo 'Database: ' . $migration['from'] . PHP_EOL;
    echo 'New database: ' . $migration['to'] . PHP_EOL;
}
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
echo PHP_EOL;
echo 'Done.' . PHP_EOL;
