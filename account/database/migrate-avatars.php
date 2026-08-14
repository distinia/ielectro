<?php
/**
 * Migrate avatars from Dyscover user folders to Account (by account_id).
 * Run once: php account/database/migrate-avatars.php
 */
declare(strict_types=1);

$root = dirname(__DIR__, 2);
require_once $root . '/nesh/src/autoload.php';

if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', $root);
}

$dyscoverAssets = $root . '/dyscover/assets';
$accountAssets = $root . '/account/assets';
$defaultSource = $dyscoverAssets . '/default-user';
$defaultTarget = $accountAssets . '/default-user';

echo "=== Avatar migration ===\n";

if (is_dir($defaultSource) && !is_dir($defaultTarget)) {
    Nesh\File::copyDirectory($defaultSource, $defaultTarget, true);
    echo "[OK] Copied default-user assets to account\n";
} elseif (is_dir($defaultTarget)) {
    echo "[SKIP] account/assets/default-user already exists\n";
} else {
    echo "[WARN] No default-user source found\n";
}

$rows = Nesh\Query::fetchAll(
    'SELECT id, account_id FROM ielectro_dyscover.dyscover_users ORDER BY id ASC'
);

$migrated = 0;
$skipped = 0;
$missing = 0;

foreach ($rows as $row) {
    $dyscoverUserId = (int) $row['id'];
    $accountId = (int) $row['account_id'];
    if ($accountId <= 0) {
        $missing++;
        continue;
    }

    $source = $dyscoverAssets . '/users/' . $dyscoverUserId . '/avatar.png';
    $targetDir = Nesh\Avatar::assetsDir($accountId);
    $target = Nesh\Avatar::path($accountId);

    Nesh\File::makeDirectory($targetDir);

    if (!is_file($source)) {
        Nesh\Avatar::provision($accountId);
        $skipped++;
        continue;
    }

    if (is_file($target)) {
        $skipped++;
        continue;
    }

    if (!copy($source, $target)) {
        echo "[FAIL] Could not copy {$source} -> {$target}\n";
        continue;
    }

    $migrated++;
}

echo "[OK] Migrated custom avatars: {$migrated}\n";
echo "[OK] Skipped/provisioned: {$skipped}\n";
if ($missing) {
    echo "[WARN] Users without account_id: {$missing}\n";
}

$accounts = Nesh\Query::fetchAll(
    'SELECT id FROM ielectro_account.accounts WHERE deletion_scheduled_at IS NULL'
);
$provisioned = 0;
foreach ($accounts as $account) {
    $accountId = (int) $account['id'];
    if (!Nesh\Avatar::exists($accountId)) {
        Nesh\Avatar::provision($accountId);
        $provisioned++;
    }
}
echo "[OK] Provisioned missing account avatars: {$provisioned}\n";
echo "=== Done ===\n";
