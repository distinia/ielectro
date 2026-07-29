<?php
new Delete();
class Delete
{
    public function __construct()
    {
        global $argv;
        $application = strtolower($argv[1] ?? '');
        $command = strtolower($argv[2] ?? '');
        $type = strtolower($argv[3] ?? '');
        $name = trim($argv[4] ?? '');
        if ($application === '') {
            echo "Usage: php nesh <application> delete [type] [name]".PHP_EOL;
            exit(1);
        }
        if ($command !== 'delete') {
            echo "Invalid command.".PHP_EOL;
            exit(1);
        }
        if ($type === '') {
            $this->application($application);
            return;
        }
        if ($name === '') {
            echo "Usage: php nesh <application> delete <type> <name>".PHP_EOL;
            exit(1);
        }
        $applicationPath = ROOT_PATH.'/'.$application;
        if (!is_dir($applicationPath)) {
            echo "Application '{$application}' not found.".PHP_EOL;
            exit(1);
        }
        match ($type) {
            'page'      => $this->page($applicationPath, $name),
            'component' => $this->component($applicationPath, $name),
            'api'       => $this->api($applicationPath, $name),
            'database'  => $this->database($applicationPath, $name),
            default     => $this->unknown($type)
        };
    }
    private function unknown(string $type): void
    {
        echo "Unknown delete type '{$type}'.".PHP_EOL;
        exit(1);
    }
    private function deleteDirectory(string $directory): void
    {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($directory, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($iterator as $item) {
            if ($item->isDir()) {
                rmdir($item->getPathname());
            } else {
                unlink($item->getPathname());
            }
        }
        rmdir($directory);
    }
        private function application(string $application): void
    {
        $directory = ROOT_PATH.'/'.$application;
        if (!is_dir($directory)) {
            echo "Application '{$application}' not found.".PHP_EOL;
            exit(1);
        }
        $this->deleteDirectory($directory);
        echo "Application '{$application}' deleted successfully.".PHP_EOL;
    }
    private function page(string $application, string $name): void
    {
        $directory = $application.'/public/pages/'.$name;
        if (!is_dir($directory)) {
            echo "Page '{$name}' not found.".PHP_EOL;
            exit(1);
        }
        $this->deleteDirectory($directory);
        echo "Page '{$name}' deleted successfully.".PHP_EOL;
    }
    private function component(string $application, string $name): void
    {
        $directory = $application.'/src/components/'.$name;
        if (!is_dir($directory)) {
            echo "Component '{$name}' not found.".PHP_EOL;
            exit(1);
        }
        $this->deleteDirectory($directory);
        echo "Component '{$name}' deleted successfully.".PHP_EOL;
    }
    private function api(string $application, string $name): void
    {
        $file = $application.'/public/api/'.$name.'.php';
        if (!file_exists($file)) {
            echo "API '{$name}' not found.".PHP_EOL;
            exit(1);
        }
        unlink($file);
        echo "API '{$name}' deleted successfully.".PHP_EOL;
    }
    private function database(string $application, string $name): void
    {
        $files = glob($application.'/src/database/*-'.$name.'.sql');
        if (!$files) {
            echo "Database '{$name}' not found.".PHP_EOL;
            exit(1);
        }
        unlink($files[0]);
        echo "Database '{$name}' deleted successfully.".PHP_EOL;
    }
}