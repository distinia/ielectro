<?php
use Nesh\DatabaseCli;
use Nesh\Deployment;
$url = '';
$database = null;
$inPlace = false;
for ($index = 2, $count = count($argv); $index < $count; $index++) {
    $argument = $argv[$index];
    if ($argument === '--in-place') {
        $inPlace = true;
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
    if ($database === null) {
        $database = $argument;
    }
}
if ($url === '') {
    printDeployUsage(true);
    exit(1);
}
if (!$inPlace) {
    try {
        $folderName = Deployment::folderNameFromUrl($url);
        $targetRoot = Deployment::pathFromUrl($url);
        echo 'Creating deployment copy...' . PHP_EOL;
        echo 'Source: ' . ROOT_PATH . PHP_EOL;
        echo 'Target: ' . $targetRoot . PHP_EOL;
        echo PHP_EOL;
        Deployment::copyProject(ROOT_PATH, $targetRoot);
        $command = [
            PHP_BINARY,
            $targetRoot . '/nesh/cli/nesh',
            'deploy',
            '--in-place',
            $url,
        ];
        if ($database !== null) {
            $command[] = $database;
        }
        $commandLine = implode(' ', array_map('escapeshellarg', $command));
        passthru($commandLine, $exitCode);
        if ($exitCode !== 0) {
            exit($exitCode);
        }
        $zipPath = Deployment::zipDirectory($targetRoot);
        echo PHP_EOL;
        echo 'Deployment package ready at: ' . $targetRoot . PHP_EOL;
        echo 'Archive: ' . $zipPath . PHP_EOL;
        exit(0);
    } catch (\InvalidArgumentException $exception) {
        echo 'Error: ' . $exception->getMessage() . PHP_EOL;
        exit(1);
    } catch (\RuntimeException $exception) {
        echo 'Error: ' . $exception->getMessage() . PHP_EOL;
        exit(1);
    }
}
try {
    $deployment = new Deployment(ROOT_PATH);
    $result = $deployment->apply($url);
    $databaseResult = null;
    $sqlResult = null;
    if ($database !== null) {
        $databaseResult = (new DatabaseCli(ROOT_PATH))->applyUnified($database);
        $sqlResult = $deployment->buildUnifiedSql();
    }
    $bootMarkers = $deployment->clearBootMarkers();
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
if (!empty($result['user_assets_cleared'])) {
    echo PHP_EOL;
    echo 'User assets cleared:' . PHP_EOL;
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
}
if ($sqlResult !== null) {
    echo PHP_EOL;
    echo 'Unified SQL: ' . $sqlResult['path'] . PHP_EOL;
    echo 'SQL files merged: ' . $sqlResult['files'] . PHP_EOL;
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
function printDeployUsage(bool $isError): void
{
    if ($isError) {
        echo 'Usage: php nesh deploy <URL> [database]' . PHP_EOL;
    }
    echo PHP_EOL;
    echo 'Creates a sibling deployment folder named from the domain, configures URLs,' . PHP_EOL;
    echo 'optionally unifies all databases under one name, builds SQL, clears user assets,' . PHP_EOL;
    echo 'and creates a ZIP archive. The source project stays unchanged.' . PHP_EOL;
    echo PHP_EOL;
    echo 'Options:' . PHP_EOL;
    echo '  --in-place      Configure the current folder instead of creating a copy.' . PHP_EOL;
    echo PHP_EOL;
    echo 'Examples:' . PHP_EOL;
    echo '  php nesh deploy https://www.example.it my_ielectro' . PHP_EOL;
    echo '  php nesh deploy https://ielectro.altervista.org ielectro' . PHP_EOL;
    echo '  php nesh deploy https://www.example.it' . PHP_EOL;
}
