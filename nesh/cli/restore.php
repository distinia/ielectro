<?php
new Restore();
class Restore
{
    public function __construct()
    {
        global $argv;
        $application = strtolower($argv[1] ?? '');
        $command = strtolower($argv[2] ?? '');
        $backup = trim($argv[3] ?? '');
        if ($application === '' || $backup === '') {
            echo "Usage: php nesh <application> restore <backup>".PHP_EOL;
            exit(1);
        }
        if ($command !== 'restore') {
            echo "Invalid command.".PHP_EOL;
            exit(1);
        }
        $applicationPath = ROOT_PATH.'/'.$application;
        if (!is_dir($applicationPath)) {
            echo "Application '{$application}' not found.".PHP_EOL;
            exit(1);
        }
        echo "Restoring backup...".PHP_EOL;
        $this->restore($applicationPath, $backup);
        echo PHP_EOL."Restore completed successfully.".PHP_EOL;
    }
    private function restore(string $application, string $backup): void
    {
        if (!str_ends_with($backup, '.zip')) {
            $backup .= '.zip';
        }
        $zipFile = $application.'/storage/backups/'.$backup;
        if (!file_exists($zipFile)) {
            echo "Backup '{$backup}' not found.".PHP_EOL;
            exit(1);
        }
        $zip = new ZipArchive();
        if ($zip->open($zipFile) !== true) {
            echo "Unable to open backup.".PHP_EOL;
            exit(1);
        }
        $this->deleteDirectory($application.'/src');
        $this->deleteDirectory($application.'');
        $zip->extractTo($application);
        $database = $application.'/database.sql';
        if (file_exists($database)) {
            $databaseName = 'ielectro_' . basename($application);
            $command = sprintf(
                'mysql -h%s -u%s -p%s %s < %s',
                DB_HOST,
                DB_USER,
                DB_PASS,
                $databaseName,
                escapeshellarg($database)
            );
            exec($command);
            unlink($database);
        }
        $zip->close();
        echo "Backup restored.".PHP_EOL;
    }
    private function deleteDirectory(string $directory): void
    {
        if (!is_dir($directory)) {
            return;
        }
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(
                $directory,
                RecursiveDirectoryIterator::SKIP_DOTS
            ),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($iterator as $item) {
            $item->isDir()
                ? rmdir($item->getPathname())
                : unlink($item->getPathname());
        }
        rmdir($directory);
    }
}