<?php
use Nesh\DatabaseCli;
use Nesh\Deployment;
$url = '';
$version = null;
$database = null;
$dbConnection = [];
$app = null;
$inPlace = false;
for ($index = 2, $count = count($argv); $index < $count; $index++) {
    $argument = $argv[$index];
    if ($argument === '--in-place') {
        $inPlace = true;
        continue;
    }
    if ($argument === '--db') {
        $database = $argv[++$index] ?? '';
        if ($database === '') {
            echo 'Error: Missing value for --db.' . PHP_EOL;
            exit(1);
        }
        continue;
    }
    if ($argument === '--db-host') {
        $dbConnection['host'] = $argv[++$index] ?? '';
        if ($dbConnection['host'] === '') {
            echo 'Error: Missing value for --db-host.' . PHP_EOL;
            exit(1);
        }
        continue;
    }
    if ($argument === '--db-user') {
        $dbConnection['user'] = $argv[++$index] ?? '';
        if ($dbConnection['user'] === '') {
            echo 'Error: Missing value for --db-user.' . PHP_EOL;
            exit(1);
        }
        continue;
    }
    if ($argument === '--db-pass') {
        $dbConnection['pass'] = $argv[++$index] ?? null;
        if ($dbConnection['pass'] === null) {
            echo 'Error: Missing value for --db-pass.' . PHP_EOL;
            exit(1);
        }
        continue;
    }
    if ($argument === '--app') {
        $app = $argv[++$index] ?? '';
        if ($app === '') {
            echo 'Error: Missing value for --app.' . PHP_EOL;
            exit(1);
        }
        continue;
    }
    if ($argument === '--help' || $argument === '-h') {
        printDeployUsage(false);
        exit(0);
    }
    if (str_starts_with($argument, '--')) {
        echo 'Error: Unknown option: ' . $argument . PHP_EOL;
        printDeployUsage(true);
        exit(1);
    }
    if ($url === '') {
        $url = $argument;
        continue;
    }
    if ($version === null && Deployment::isAssetVersion($argument)) {
        $version = $argument;
        continue;
    }
    echo 'Error: Unexpected argument: ' . $argument . PHP_EOL;
    printDeployUsage(true);
    exit(1);
}
if ($url === '') {
    printDeployUsage(true);
    exit(1);
}
if ($app !== null && $database !== null) {
    echo 'Error: --app and --db cannot be used together.' . PHP_EOL;
    exit(1);
}
if ($app !== null && $dbConnection !== []) {
    echo 'Error: --app cannot be used with database connection options.' . PHP_EOL;
    exit(1);
}
if ($inPlace) {
    $targetRoot = str_replace('\\', '/', realpath(Deployment::pathFromUrl($url)) ?: Deployment::pathFromUrl($url));
    $currentRoot = str_replace('\\', '/', realpath(ROOT_PATH) ?: ROOT_PATH);
    if ($currentRoot !== $targetRoot) {
        echo 'Error: In-place deploy can only run inside the deployment folder.' . PHP_EOL;
        echo 'Expected: ' . Deployment::pathFromUrl($url) . PHP_EOL;
        echo 'Current:  ' . ROOT_PATH . PHP_EOL;
        echo 'Run a full deploy instead: php nesh deploy ' . $url . ' [version] [options]' . PHP_EOL;
        exit(1);
    }
}
try {
    if ($app !== null) {
        runAppDeploy($url, $version, $app);
        exit(0);
    }
    if (!$inPlace) {
        runFullDeploy($url, $version, $database, $dbConnection);
        exit(0);
    }
    runInPlaceDeploy($url, $version, $database, $dbConnection);
} catch (\InvalidArgumentException $exception) {
    echo 'Error: ' . $exception->getMessage() . PHP_EOL;
    exit(1);
} catch (\RuntimeException $exception) {
    echo 'Error: ' . $exception->getMessage() . PHP_EOL;
    exit(1);
}
function runAppDeploy(string $url, ?string $version, string $app): void
{
    if ($version === null) {
        throw new \InvalidArgumentException('Version is required for --app deploy.');
    }
    $app = Deployment::validateAppFolder($app);
    $targetRoot = Deployment::pathFromUrl($url);
    if (!is_dir($targetRoot)) {
        throw new \InvalidArgumentException(
            'Deployment folder not found: ' . $targetRoot . '. Run a full deploy first.'
        );
    }
    echo 'Updating application: ' . $app . PHP_EOL;
    echo 'Deployment: ' . $targetRoot . PHP_EOL;
    echo 'Version: ' . $version . PHP_EOL;
    echo PHP_EOL;
    Deployment::copyAppFolder(ROOT_PATH, $targetRoot, $app);
    $databaseCli = new DatabaseCli($targetRoot);
    $databaseSync = $databaseCli->syncDeploymentReferences();
    $deployment = new Deployment($targetRoot);
    $assetVersionResult = $deployment->applyAssetVersion($version, $app);
    $zipPath = Deployment::zipAppDirectory($targetRoot, $app);
    echo 'Asset version: ' . $assetVersionResult['version'] . PHP_EOL;
    echo 'Asset files updated: ' . $assetVersionResult['files'] . PHP_EOL;
    echo 'Asset version tags added: ' . $assetVersionResult['replacements'] . PHP_EOL;
    if ($databaseSync['synced'] && (
        $databaseSync['updated']['php'] > 0
        || $databaseSync['updated']['sql'] > 0
        || $databaseSync['updated']['other'] > 0
    )) {
        echo 'Database references synced to "' . $databaseSync['database'] . '":' . PHP_EOL;
        if ($databaseSync['updated']['php'] > 0) {
            echo '- ' . $databaseSync['updated']['php'] . ' PHP files' . PHP_EOL;
        }
        if ($databaseSync['updated']['sql'] > 0) {
            echo '- ' . $databaseSync['updated']['sql'] . ' SQL files' . PHP_EOL;
        }
        if ($databaseSync['updated']['other'] > 0) {
            echo '- ' . $databaseSync['updated']['other'] . ' other files' . PHP_EOL;
        }
    }
    echo PHP_EOL;
    echo 'Deployment folder: ' . $targetRoot . PHP_EOL;
    echo 'Archive: ' . $zipPath . PHP_EOL;
    echo PHP_EOL;
    echo 'Application deploy completed successfully.' . PHP_EOL;
}
function runFullDeploy(
    string $url,
    ?string $version,
    ?string $database,
    array $dbConnection
): void {
    $targetRoot = Deployment::pathFromUrl($url);
    echo 'Creating deployment copy...' . PHP_EOL;
    echo 'Source: ' . ROOT_PATH . PHP_EOL;
    echo 'Target: ' . $targetRoot . PHP_EOL;
    echo PHP_EOL;
    Deployment::copyProject(ROOT_PATH, $targetRoot);
    $command = buildInPlaceCommand($targetRoot, $url, $version, $database, $dbConnection);
    passthru($command, $exitCode);
    if ($exitCode !== 0) {
        exit($exitCode);
    }
    $zipPath = Deployment::zipDirectory($targetRoot);
    echo PHP_EOL;
    echo 'Deployment folder: ' . $targetRoot . PHP_EOL;
    echo 'Archive: ' . $zipPath . PHP_EOL;
}
function runInPlaceDeploy(
    string $url,
    ?string $version,
    ?string $database,
    array $dbConnection
): void {
    $deployment = new Deployment(ROOT_PATH);
    $result = $deployment->apply($url);
    $databaseResult = null;
    $dbConnectionResult = null;
    $sqlResult = null;
    $assetVersionResult = null;
    if ($database !== null) {
        $databaseResult = (new DatabaseCli(ROOT_PATH))->applyUnified($database);
        $sqlResult = $deployment->buildUnifiedSql();
    }
    if ($dbConnection !== []) {
        $dbConnectionResult = $deployment->applyDatabaseConfig($dbConnection);
    }
    if ($version !== null) {
        $assetVersionResult = $deployment->applyAssetVersion($version);
    }
    $bootMarkers = $deployment->clearBootMarkers();
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
    if (!empty($result['user_assets_cleared'])) {
        echo PHP_EOL;
        echo 'User assets cleared (deployment only):' . PHP_EOL;
        foreach ($result['user_assets_cleared'] as $path) {
            echo '- ' . $path . PHP_EOL;
        }
    }
    if ($databaseResult !== null) {
        echo PHP_EOL;
        if ($databaseResult['unchanged']) {
            echo 'Database already set to "' . $database . '".' . PHP_EOL;
        } else {
            echo 'Database unified as "' . $database . '":' . PHP_EOL;
            foreach ($databaseResult['migrations'] as $migration) {
                echo '- '
                    . $migration['folder']
                    . ': '
                    . $migration['from']
                    . ' -> '
                    . $migration['to']
                    . PHP_EOL;
            }
        }
        if (
            $databaseResult['updated']['php'] > 0
            || $databaseResult['updated']['sql'] > 0
            || $databaseResult['updated']['other'] > 0
        ) {
            echo 'Project references updated:' . PHP_EOL;
            if ($databaseResult['updated']['php'] > 0) {
                echo '- ' . $databaseResult['updated']['php'] . ' PHP files' . PHP_EOL;
            }
            if ($databaseResult['updated']['sql'] > 0) {
                echo '- ' . $databaseResult['updated']['sql'] . ' SQL files' . PHP_EOL;
            }
            if ($databaseResult['updated']['other'] > 0) {
                echo '- ' . $databaseResult['updated']['other'] . ' other files' . PHP_EOL;
            }
        }
    }
    if ($dbConnectionResult !== null && $dbConnectionResult['updated'] !== []) {
        echo PHP_EOL;
        echo 'Database connection updated in autoload.php:' . PHP_EOL;
        foreach ($dbConnectionResult['updated'] as $key => $value) {
            if ($key === 'pass') {
                echo '- pass: (hidden)' . PHP_EOL;
                continue;
            }
            echo '- ' . $key . ': ' . $value . PHP_EOL;
        }
    }
    if ($sqlResult !== null) {
        echo PHP_EOL;
        echo 'Unified SQL: ' . $sqlResult['path'] . PHP_EOL;
        echo 'SQL files merged: ' . $sqlResult['files'] . PHP_EOL;
    }
    if ($assetVersionResult !== null) {
        echo PHP_EOL;
        echo 'Asset version: ' . $assetVersionResult['version'] . PHP_EOL;
        echo 'Asset files updated: ' . $assetVersionResult['files'] . PHP_EOL;
        echo 'Asset version tags added: ' . $assetVersionResult['replacements'] . PHP_EOL;
    }
    if ($bootMarkers !== []) {
        echo PHP_EOL;
        echo 'Boot markers removed:' . PHP_EOL;
        foreach ($bootMarkers as $path) {
            echo '- ' . $path . PHP_EOL;
        }
    }
    echo PHP_EOL;
    echo 'Deployment completed successfully.' . PHP_EOL;
}
function buildInPlaceCommand(
    string $targetRoot,
    string $url,
    ?string $version,
    ?string $database,
    array $dbConnection
): string {
    $command = [
        PHP_BINARY,
        $targetRoot . '/nesh/cli/nesh',
        'deploy',
        '--in-place',
        $url,
    ];
    if ($version !== null) {
        $command[] = $version;
    }
    if ($database !== null) {
        $command[] = '--db';
        $command[] = $database;
    }
    foreach ([
        'host' => '--db-host',
        'user' => '--db-user',
        'pass' => '--db-pass',
    ] as $key => $flag) {
        if (!array_key_exists($key, $dbConnection)) {
            continue;
        }
        $command[] = $flag;
        $command[] = (string) $dbConnection[$key];
    }
    return implode(' ', array_map('escapeshellarg', $command));
}
function printDeployUsage(bool $isError): void
{
    if ($isError) {
        echo 'Usage: php nesh deploy <URL> [version] [options]' . PHP_EOL;
    }
    echo PHP_EOL;
    echo 'Full deploy creates or overwrites a sibling folder named from the domain,' . PHP_EOL;
    echo 'configures URLs, optionally unifies databases, stamps assets, builds SQL,' . PHP_EOL;
    echo 'clears user assets, and creates a full ZIP archive.' . PHP_EOL;
    echo PHP_EOL;
    echo 'Options:' . PHP_EOL;
    echo '  --db <name>       Unify all databases under one name and build SQL.' . PHP_EOL;
    echo '  --db-host <host>  Set DB_HOST in the deployment autoload.php.' . PHP_EOL;
    echo '  --db-user <user>  Set DB_USER in the deployment autoload.php.' . PHP_EOL;
    echo '  --db-pass <pass>  Set DB_PASS (optional, defaults to empty).' . PHP_EOL;
    echo '  --app <folder>    Update one application in an existing deployment,' . PHP_EOL;
    echo '                    stamp its assets, and create a ZIP with that app only.' . PHP_EOL;
    echo '  --in-place        Configure the current folder instead of creating a copy.' . PHP_EOL;
    echo PHP_EOL;
    echo 'Examples:' . PHP_EOL;
    echo '  php nesh deploy https://www.example.it 1.2.1 --db my_ielectro' . PHP_EOL;
    echo '  php nesh deploy https://ielectro.altervista.org 1.2.1 --db my_ielectro \\' . PHP_EOL;
    echo '    --db-host localhost --db-user myuser --db-pass mypass' . PHP_EOL;
    echo '  php nesh deploy https://www.example.it 1.2.1 --app account' . PHP_EOL;
}
