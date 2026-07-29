<?php
new Build();
class Build
{
    public function __construct()
    {
        global $argv;
        $application = strtolower($argv[1] ?? '');
        $command = strtolower($argv[2] ?? '');
        if ($application === '') {
            echo "Usage: php nesh <application> build".PHP_EOL;
            exit(1);
        }
        if ($command !== 'build') {
            echo "Invalid command.".PHP_EOL;
            exit(1);
        }
        $path = ROOT_PATH.'/'.$application;
        if (!is_dir($path)) {
            echo "Application '{$application}' not found.".PHP_EOL;
            exit(1);
        }
        echo "Building {$application}...".PHP_EOL.PHP_EOL;
        echo "  • Updating database...".PHP_EOL;
        $this->database($path);
        echo PHP_EOL;
        echo "Build completed successfully.".PHP_EOL;
    }
    private function database(string $application): void
    {
        $database = $application.'/database';
        if (!is_dir($database)) {
            echo "No database directory found.".PHP_EOL;
            return;
        }
        new \Nesh\Schema($database);
    }
}