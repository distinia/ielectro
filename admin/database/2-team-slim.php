<?php
/**
 * Slim team table: name/avatar come from account; drop local copies.
 * Run: php admin/database/2-team-slim.php
 */
declare(strict_types=1);

$root = dirname(__DIR__, 2);
require_once $root . '/nesh/src/autoload.php';

if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', $root);
}

$columns = [
    'full_name' => 'DROP COLUMN `full_name`',
    'avatar' => 'DROP COLUMN `avatar`',
    'instagram' => 'DROP COLUMN `instagram`',
];

foreach ($columns as $name => $sqlPart) {
    $exists = Nesh\Query::fetch(
        "SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'ielectro_admin'
        AND TABLE_NAME = 'team'
        AND COLUMN_NAME = ?
        LIMIT 1",
        [$name]
    );
    if (!$exists) {
        echo "[SKIP] team.{$name} already removed\n";
        continue;
    }
    Nesh\Query::execute("ALTER TABLE ielectro_admin.team {$sqlPart}");
    echo "[OK] Dropped team.{$name}\n";
}

echo "=== Done ===\n";
