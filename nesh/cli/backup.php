<?php
new Backup();
class Backup
{
    public function __construct()
    {
        global $argv;
        $application = strtolower($argv[1] ?? '');
        $command = strtolower($argv[2] ?? '');
        if ($application === '') {
            echo "Usage: php nesh <application> backup".PHP_EOL;
            exit(1);
        }
        if ($command !== 'backup') {
            echo "Invalid command.".PHP_EOL;
            exit(1);
        }
        $applicationPath = ROOT_PATH.'/'.$application;
        if (!is_dir($applicationPath)) {
            echo "Application '{$application}' not found.".PHP_EOL;
            exit(1);
        }
        echo "Creating backup...".PHP_EOL;
        $this->backup($applicationPath);
        echo PHP_EOL."Backup completed successfully.".PHP_EOL;
    }
    private function backup(string $application): void
    {
        $backupDirectory = $application.'/storage/backups';
        if (!is_dir($backupDirectory)) {
            mkdir($backupDirectory, 0777, true);
        }
        $name = date('Ymd-His');
        $zipFile = $backupDirectory.'/'.$name.'.zip';
        $zip = new ZipArchive();
        if ($zip->open($zipFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            echo "Unable to create backup.".PHP_EOL;
            exit(1);
        }
        $this->addDirectory($zip, $application.'/src', 'src');
        $this->addDirectory($zip, $application.'', 'public');
        $dumpFile = $application . '/storage/database.sql';
        $databaseName = 'ielectro_' . basename($application);
        $command = sprintf(
            'mysqldump -h%s -u%s -p%s %s > %s',
            DB_HOST,
            DB_USER,
            DB_PASS,
            $databaseName,
            escapeshellarg($dumpFile)
        );
        exec($command);
        if (file_exists($dumpFile)) {
            $zip->addFile($dumpFile, 'database.sql');
            unlink($dumpFile);
        }
        $zip->close();
        echo "Backup '{$name}.zip' created.".PHP_EOL;
    }
    private function addDirectory(ZipArchive $zip, string $directory, string $root): void
    {
        if (!is_dir($directory)) {
            return;
        }
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(
                $directory,
                RecursiveDirectoryIterator::SKIP_DOTS
            )
        );
        foreach ($iterator as $file) {
            if (!$file->isFile()) {
                continue;
            }
            $relative = $root.'/' .
                substr($file->getPathname(), strlen($directory) + 1);
            $zip->addFile($file->getPathname(), str_replace('\\', '/', $relative));
        }
    }
}