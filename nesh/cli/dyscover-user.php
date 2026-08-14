<?php
global $argv;
$userId = (int) ($argv[2] ?? 0);
if ($userId <= 0) {
    echo 'Usage: php nesh dyscover-user <user_id>' . PHP_EOL;
    exit(1);
}
try {
    $summary = (new \Dyscover\UserMigrate($userId))->run();
} catch (\Throwable $exception) {
    echo 'Error: ' . $exception->getMessage() . PHP_EOL;
    exit(1);
}
echo 'Dyscover user migration completed.' . PHP_EOL;
echo '  User ID: ' . $summary['user_id'] . PHP_EOL;
echo '  Source: ' . $summary['source'] . PHP_EOL;
echo '  Posts migrated: ' . $summary['posts'] . PHP_EOL;
if (!empty($summary['posts_by_type'])) {
    foreach ($summary['posts_by_type'] as $type => $count) {
        echo '    - ' . $type . ': ' . $count . PHP_EOL;
    }
}
echo '  Templates: ' . $summary['templates'] . PHP_EOL;
echo '  Template fields: ' . $summary['fields'] . PHP_EOL;
echo '  Tags linked: ' . $summary['tags'] . PHP_EOL;
echo '  Files renamed: ' . $summary['renamed'] . PHP_EOL;
echo '  Template JSON deleted: ' . $summary['deleted_json'] . PHP_EOL;
