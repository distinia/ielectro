<?php
/**
 * Admin smoke tests — run: php admin/tests/smoke.php
 */
declare(strict_types=1);

$root = dirname(__DIR__, 2);
require_once $root . '/nesh/src/autoload.php';

if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', $root);
}

$failures = 0;
$passed = 0;

function assertTrue(bool $condition, string $message): void
{
    global $failures, $passed;
    if ($condition) {
        echo "[OK] {$message}\n";
        $passed++;
        return;
    }
    echo "[FAIL] {$message}\n";
    $failures++;
}

function assertEq(mixed $expected, mixed $actual, string $message): void
{
    assertTrue($expected === $actual, $message . " (expected " . var_export($expected, true) . ", got " . var_export($actual, true) . ")");
}

echo "=== Admin smoke tests ===\n\n";

// 1. PHP syntax on API files
$apiFiles = glob($root . '/admin/api/*.php') ?: [];
foreach ($apiFiles as $file) {
    $output = [];
    $code = 0;
    exec('php -l ' . escapeshellarg($file) . ' 2>&1', $output, $code);
    assertTrue($code === 0, 'Syntax: ' . basename($file));
}

// 2. Admin paths
require_once $root . '/admin/api/paths.php';
assertTrue(defined('ADMIN_ROOT'), 'ADMIN_ROOT is defined');
assertTrue(is_dir(ADMIN_ROOT), 'ADMIN_ROOT directory exists');
assertEq(str_replace('\\', '/', $root . '/admin'), str_replace('\\', '/', ADMIN_ROOT), 'ADMIN_ROOT points to admin root');

$contentNews = Admin\MediaPaths::newsDir();
$applicationsDir = Admin\MediaPaths::applicationsDir();
Nesh\File::makeDirectory($contentNews);
Nesh\File::makeDirectory($applicationsDir);
assertTrue(is_dir($contentNews), 'News assets directory writable');
assertTrue(is_dir($applicationsDir), 'Applications assets directory writable');
assertTrue(
    str_contains(str_replace('\\', '/', $contentNews), '/www/assets/news'),
    'News dir is under www/assets/news'
);
assertTrue(
    str_starts_with(str_replace('\\', '/', $applicationsDir), str_replace('\\', '/', ADMIN_ROOT . '/assets')),
    'Applications dir is under admin/assets'
);

// 3. Database connectivity
try {
    Nesh\Query::fetch('SELECT 1 AS ok');
    assertTrue(true, 'Database connection');
} catch (Throwable $e) {
    assertTrue(false, 'Database connection: ' . $e->getMessage());
    echo "\nSkipped DB-dependent tests.\n";
    exit($failures > 0 ? 1 : 0);
}

// 4. Team table has account_id column
try {
    $column = Nesh\Query::fetch(
        "SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'ielectro_admin'
        AND TABLE_NAME = 'team'
        AND COLUMN_NAME = 'account_id'
        LIMIT 1"
    );
    assertTrue((bool) $column, 'team.account_id column exists');
} catch (Throwable $e) {
    assertTrue(false, 'team.account_id column check: ' . $e->getMessage());
}

// 5. Accounts search query (same as accounts.php)
try {
    $rows = Nesh\Query::fetchAll(
        'SELECT id, username, email
        FROM ' . Nesh\Schema::ACCOUNTS . '
        WHERE deletion_scheduled_at IS NULL
        ORDER BY id ASC
        LIMIT 5'
    );
    assertTrue(is_array($rows), 'Accounts table readable');
    if ($rows) {
        $like = '%' . substr((string) $rows[0]['username'], 0, 2) . '%';
        $found = Nesh\Query::fetchAll(
            'SELECT id, username, email
            FROM ' . Nesh\Schema::ACCOUNTS . '
            WHERE deletion_scheduled_at IS NULL
            AND (username LIKE ? OR email LIKE ?)
            LIMIT 20',
            [$like, $like]
        );
        assertTrue(count($found) >= 1, 'Account search query returns results');
    } else {
        echo "[SKIP] No accounts in database for search test\n";
    }
} catch (Throwable $e) {
    assertTrue(false, 'Accounts search: ' . $e->getMessage());
}

// 6. Team CRUD round-trip
$testUuid = null;
$testId = null;
try {
    $testUuid = Nesh\Generate::uuid();
    Nesh\Query::begin();
    $accountId = null;
    $accounts = Nesh\Query::fetchAll(
        'SELECT id FROM ' . Nesh\Schema::ACCOUNTS . ' WHERE deletion_scheduled_at IS NULL ORDER BY id ASC LIMIT 1'
    );
    if ($accounts) {
        $accountId = (int) $accounts[0]['id'];
    }
    Nesh\Query::execute(
        "INSERT INTO ielectro_admin.team(
            uuid, account_id, role_text, status
        ) VALUES (?, ?, ?, 'active')",
        [$testUuid, $accountId, 'QA Engineer']
    );
    $testId = (int) Nesh\Query::lastId();
    Nesh\Query::commit();
    assertTrue($testId > 0, 'Team member created');

    $row = Nesh\Query::fetch(
        "SELECT t.id, t.role_text, a.username AS account_username
        FROM ielectro_admin.team t
        LEFT JOIN " . Nesh\Schema::ACCOUNTS . " a ON a.id = t.account_id
        WHERE t.id = ?
        LIMIT 1",
        [$testId]
    );
    assertEq('QA Engineer', $row['role_text'] ?? null, 'Team role read back');

    Nesh\Query::execute(
        "UPDATE ielectro_admin.team SET role_text = ? WHERE id = ?",
        ['Senior QA Engineer', $testId]
    );
    $updated = Nesh\Query::fetch(
        "SELECT role_text FROM ielectro_admin.team WHERE id = ? LIMIT 1",
        [$testId]
    );
    assertEq('Senior QA Engineer', $updated['role_text'] ?? null, 'Team member updated');

    Nesh\Query::execute("DELETE FROM ielectro_admin.team WHERE id = ?", [$testId]);
    $testId = null;
    assertTrue(true, 'Team member deleted');
} catch (Throwable $e) {
    try {
        Nesh\Query::rollback();
    } catch (Throwable) {
    }
    if ($testId) {
        @Nesh\Query::execute("DELETE FROM ielectro_admin.team WHERE id = ?", [$testId]);
    }
    assertTrue(false, 'Team CRUD: ' . $e->getMessage());
}

// 7. News insert without image (APP_PUBLIC path)
$newsId = null;
try {
    $newsUuid = Nesh\Generate::uuid();
    Nesh\Query::execute(
        "INSERT INTO ielectro_admin.news(uuid, title, body, status)
        VALUES (?, ?, ?, 'published')",
        [$newsUuid, 'Smoke test article', 'Body content for smoke test']
    );
    $newsId = (int) Nesh\Query::lastId();
    assertTrue($newsId > 0, 'News article created without image');

    require_once $root . '/admin/api/news.php';
    $dir = Admin\NewsFields::contentDir();
    assertTrue(is_dir($dir), 'NewsFields::contentDir() resolves');
    assertTrue(
        str_contains(str_replace('\\', '/', $dir), '/www/assets/news'),
        'News content dir is under www/assets/news'
    );

    Nesh\Query::execute("DELETE FROM ielectro_admin.news WHERE id = ?", [$newsId]);
    $newsId = null;
    assertTrue(true, 'News article deleted');
} catch (Throwable $e) {
    if ($newsId) {
        @Nesh\Query::execute("DELETE FROM ielectro_admin.news WHERE id = ?", [$newsId]);
    }
    assertTrue(false, 'News create: ' . $e->getMessage());
}

// 8. Analytics endpoint queries
try {
    require_once $root . '/admin/api/analytics.php';
    $overview = (new ReflectionClass(Admin\Analytics::class))->getMethod('overview');
    $overview->setAccessible(true);
    $stats = $overview->invoke(null);
    assertTrue(isset($stats['total_accounts']), 'Analytics overview returns total_accounts');
    assertTrue(is_array($stats), 'Analytics overview is array');
    echo "[OK] Analytics overview query\n";
    $passed++;
} catch (Throwable $e) {
    echo "[FAIL] Analytics overview: " . $e->getMessage() . "\n";
    $failures++;
}

echo "\n=== Results: {$passed} passed, {$failures} failed ===\n";
exit($failures > 0 ? 1 : 0);
