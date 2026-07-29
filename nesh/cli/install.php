<?php
new Install();
class Install
{
    public function __construct()
    {
        echo "Installing NESH by iElectro...".PHP_EOL.PHP_EOL;
        echo "  • Creating database...".PHP_EOL;
        $this->database();
        echo "  • Initializing application databases...".PHP_EOL;
        $applications = $this->applications();
        echo "  • Generating nesh.js...".PHP_EOL;
        $classes = $this->javascript();
        echo PHP_EOL;
        echo "Applications initialized: {$applications}".PHP_EOL;
        echo "JavaScript classes exported: {$classes}".PHP_EOL;
        echo PHP_EOL;
        echo "Installation completed successfully.".PHP_EOL;
    }
    private function database(): void
    {
        $connection = mysqli_connect(DB_HOST, DB_USER, DB_PASS);
        if (!$connection) {
            echo "Connection error.".PHP_EOL;
            exit(1);
        }
        if (!mysqli_set_charset($connection, DB_CHARSET)) {
            echo "Charset error.".PHP_EOL;
            exit(1);
        }
        if (!mysqli_query(
            $connection,
            "CREATE DATABASE IF NOT EXISTS `".DB_NAME."`
            CHARACTER SET ".DB_CHARSET."
            COLLATE utf8mb4_unicode_ci"
        )) {
            echo "Database creation error.".PHP_EOL;
            exit(1);
        }
        if (!mysqli_select_db($connection, DB_NAME)) {
            echo "Database selection error.".PHP_EOL;
            exit(1);
        }
        mysqli_close($connection);
    }
    private function applications(): int
    {
        $count = 0;
        $iterator = new DirectoryIterator(ROOT_PATH);
        foreach ($iterator as $directory) {
            if (
                !$directory->isDir() ||
                $directory->isDot() ||
                $directory->getFilename() === 'nesh'
            ) {
                continue;
            }
            $database = $directory->getPathname().'/database';
            if (!is_dir($database)) {
                continue;
            }
            new \Nesh\Schema($database);
            $count++;
        }
        return $count;
    }
    private function javascript(): int
    {
        $base = NESH_PATH.'/public/scripts';
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(
                $base,
                RecursiveDirectoryIterator::SKIP_DOTS
            )
        );
        $files = [];
        foreach ($iterator as $file) {
            if (
                !$file->isFile() ||
                $file->getExtension() !== 'js' ||
                $file->getFilename() === 'nesh.js'
            ) {
                continue;
            }
            $files[] = $file->getPathname();
        }
        sort($files, SORT_NATURAL);
        $imports = [];
        $exports = [];
        foreach ($files as $file) {
            $relative = str_replace('\\', '/', substr($file, strlen($base) + 1));
            $class = pathinfo($relative, PATHINFO_FILENAME);
            $class = str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $class)));
            $imports[] = 'import '.$class.' from "./'.$relative.'";';
            $exports[] = '    static '.$class.' = '.$class.';';
        }
        $content = implode("\n", $imports);
        $content .= "\n\nexport default class Nesh\n{\n";
        $content .= implode("\n", $exports);
        $content .= "\n}\n";
        $output = $base.'/nesh.js';
        if (!file_exists($output) || file_get_contents($output) !== $content) {
            file_put_contents($output, $content);
        }
        return count($files);
    }
}