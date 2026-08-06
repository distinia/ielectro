<?php
require_once __DIR__ . '/../src/autoload.php';
use Nesh\App;
use Nesh\Connection;
new Install();
class Install
{
    public function __construct()
    {
        echo 'Installing NESH by iElectro...' . PHP_EOL . PHP_EOL;
        echo '  • Initializing application databases...' . PHP_EOL;
        $applications = $this->applications();
        echo '  • Generating nesh.js...' . PHP_EOL;
        $classes = $this->javascript();
        echo PHP_EOL;
        echo "Applications initialized: {$applications}" . PHP_EOL;
        echo "JavaScript classes exported: {$classes}" . PHP_EOL;
        echo PHP_EOL;
        echo 'Installation completed successfully.' . PHP_EOL;
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
            $folder = $directory->getFilename();
            $appPath = $directory->getPathname();
            if (!is_dir($appPath . '/public')) {
                continue;
            }
            $database = 'ielectro_' . $folder;
            App::bootstrapDatabase($appPath, $database);
            $count++;
        }
        Connection::close();
        return $count;
    }
    private function javascript(): int
    {
        $base = NESH_PATH . '/public/scripts';
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
            $imports[] = 'import ' . $class . ' from "./' . $relative . '";';
            $exports[] = '    static ' . $class . ' = ' . $class . ';';
        }
        $content = implode("\n", $imports);
        $content .= "\n\nexport default class Nesh\n{\n";
        $content .= implode("\n", $exports);
        $content .= "\n}\n";
        $output = $base . '/nesh.js';
        if (!file_exists($output) || file_get_contents($output) !== $content) {
            file_put_contents($output, $content);
        }
        return count($files);
    }
}
