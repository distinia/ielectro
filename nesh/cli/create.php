<?php
new Create();
class Create
{
    public function __construct()
    {
        global $argv;
       $application = strtolower($argv[1] ?? '');
        $command = strtolower($argv[2] ?? '');
        $type = strtolower($argv[3] ?? '');
        $name = trim($argv[4] ?? '');
       if ($application === '') {
            echo "Usage: php nesh <application> create <type> <name>".PHP_EOL;
            exit(1);
        }
       if ($command !== 'create') {
            echo "Invalid command.".PHP_EOL;
            exit(1);
        }
       if ($type === '' || $name === '') {
            echo "Usage: php nesh <application> create <type> <name>".PHP_EOL;
            exit(1);
        }
       $applicationPath = ROOT_PATH.'/'.$application;
       if (!is_dir($applicationPath)) {
            echo "Application '{$application}' not found.".PHP_EOL;
            exit(1);
        }
       match ($type) {
            'page'       => $this->page($applicationPath, $name),
            'component'  => $this->component($applicationPath, $name),
            'api'        => $this->api($applicationPath, $name),
            'database'   => $this->database($applicationPath, $name),
            default      => $this->unknown($type)
        };
    }
    private function unknown(string $type): void
    {
        echo "Unknown create type '{$type}'.".PHP_EOL;
        exit(1);
    }
    private function page(string $application, string $name): void
    {
        $directory = $application.'/public/pages/'.$name;
       if (is_dir($directory)) {
            echo "Error: Page '{$name}' already exists.".PHP_EOL;
            exit(1);
        }
       mkdir($directory, 0777, true);
       file_put_contents(
            $directory.'/'.$name.'.html',
            ''
        );
       file_put_contents(
            $directory.'/'.$name.'.css',
            ''
        );
       file_put_contents(
            $directory.'/'.$name.'.js',
            <<<'JS'
    import Nesh from 'https://nesh.ielectro.com/scripts/nesh.js';
    JS
        );
       file_put_contents(
            $directory.'/'.$name.'.json',
            json_encode([
                'title' => ucwords(str_replace(['-', '_'], ' ', $name)),
                'keywords' => '',
                'description' => ''
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );
       echo "Page '{$name}' created successfully.".PHP_EOL;
    }
    private function component(string $application, string $name): void
    {
        $directory = $application.'/src/components/'.$name;
        if (is_dir($directory)) {
            echo "Error: Component '{$name}' already exists.".PHP_EOL;
            exit(1);
        }
        mkdir($directory, 0777, true);
        file_put_contents(
            $directory.'/'.$name.'.css',
            ''
        );
        file_put_contents(
            $directory.'/'.$name.'.js',
            <<<JS
    import Nesh from 'https://nesh.ielectro.com/scripts/nesh.js';
    JS
        );
        echo "Component '{$name}' created successfully.".PHP_EOL;
    }
    private function api(string $application, string $name): void
    {
        $file = $application.'/public/api/'.$name.'.php';
        if (file_exists($file)) {
            echo "Error: API '{$name}' already exists.".PHP_EOL;
            exit(1);
        }
        is_dir(dirname($file)) || mkdir(dirname($file), 0777, true);
        file_put_contents(
            $file,
            <<<'PHP'
    <?php
    namespace App;
    class Example
    {
        public function index(): void
        {
        }
    }
    PHP
        );
        echo "API '{$name}' created successfully.".PHP_EOL;
    }
    private function database(string $application, string $name): void
    {
        $directory = $application.'/src/database';
        if (!is_dir($directory)) {
            mkdir($directory, 0777, true);
        }
        $number = 0;
        foreach (glob($directory.'/*.sql') as $file) {
            if (preg_match('/^(\d+)-/', basename($file), $matches)) {
                $number = max($number, (int) $matches[1] + 1);
            }
        }
        $file = $directory.'/'.$number.'-'.$name.'.sql';
        if (file_exists($file)) {
            echo "Error: Database '{$name}' already exists.".PHP_EOL;
            exit(1);
        }
        file_put_contents($file, '');
        echo "Database '{$number}-{$name}.sql' created successfully.".PHP_EOL;
    }
    private function copyDirectory(string $source, string $destination): void
    {
        mkdir($destination, 0777, true);
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(
                $source,
                RecursiveDirectoryIterator::SKIP_DOTS
            ),
            RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($iterator as $item) {
            $target = $destination.DIRECTORY_SEPARATOR .
                $iterator->getSubPathName();
            if ($item->isDir()) {
                if (!is_dir($target)) {
                    mkdir($target, 0777, true);
                }
            } else {
                copy($item->getPathname(), $target);
            }
        }
    }
}