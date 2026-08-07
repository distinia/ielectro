<?php
new Rename();
class Rename
{
    public function __construct()
    {
        global $argv;
        $application = strtolower($argv[1] ?? '');
        $command = strtolower($argv[2] ?? '');
        $type = strtolower($argv[3] ?? '');
        $old = trim($argv[4] ?? '');
        $new = trim($argv[5] ?? '');
        if ($application === '') {
            echo "Usage: php nesh <application> rename [type] <old> <new>".PHP_EOL;
            exit(1);
        }
        if ($command !== 'rename') {
            echo "Invalid command.".PHP_EOL;
            exit(1);
        }
        if ($type === '') {
            if ($old === '') {
                echo "Usage: php nesh <application> rename <new-name>".PHP_EOL;
                exit(1);
            }
            $this->application($application, $old);
            return;
        }
        if ($old === '' || $new === '') {
            echo "Usage: php nesh <application> rename <type> <old-name> <new-name>".PHP_EOL;
            exit(1);
        }
        $applicationPath = ROOT_PATH.'/'.$application;
        if (!is_dir($applicationPath)) {
            echo "Application '{$application}' not found.".PHP_EOL;
            exit(1);
        }
        match ($type) {
            'page'      => $this->page($applicationPath, $old, $new),
            'component' => $this->component($applicationPath, $old, $new),
            'api'       => $this->api($applicationPath, $old, $new),
            'database'  => $this->database($applicationPath, $old, $new),
            default     => $this->unknown($type)
        };
    }
    private function unknown(string $type): void
    {
        echo "Unknown rename type '{$type}'.".PHP_EOL;
        exit(1);
    }
    private function application(string $old, string $new): void
    {
        $oldPath = ROOT_PATH.'/'.$old;
        $newPath = ROOT_PATH.'/'.$new;
        if (!is_dir($oldPath)) {
            echo "Application '{$old}' not found.".PHP_EOL;
            exit(1);
        }
        if (is_dir($newPath)) {
            echo "Application '{$new}' already exists.".PHP_EOL;
            exit(1);
        }
        rename($oldPath, $newPath);
        echo "Application '{$old}' renamed to '{$new}' successfully.".PHP_EOL;
    }
    private function page(string $application, string $old, string $new): void
    {
        $oldDir = $application."/pages/$old";
        $newDir = $application."/pages/$new";
        if (!is_dir($oldDir)) {
            echo "Page '{$old}' not found.".PHP_EOL;
            exit(1);
        }
        if (is_dir($newDir)) {
            echo "Page '{$new}' already exists.".PHP_EOL;
            exit(1);
        }
        rename($oldDir, $newDir);
        rename("$newDir/$old.php", "$newDir/$new.php");
        rename("$newDir/$old.css", "$newDir/$new.css");
        rename("$newDir/$old.js", "$newDir/$new.js");
        $title = ucwords(str_replace(['-', '_'], ' ', $new));
        $php = "$newDir/$new.php";
        $content = file_get_contents($php);
        $content = preg_replace(
            "/generate\('.*?', '', ''\)/",
            "generate('{$title}', '', '')",
            $content
        );
        file_put_contents($php, $content);
        echo "Page renamed successfully.".PHP_EOL;
    }
    private function component(string $application, string $old, string $new): void
    {
        $oldDir = $application."/src/components/$old";
        $newDir = $application."/src/components/$new";
        if (!is_dir($oldDir)) {
            echo "Component '{$old}' not found.".PHP_EOL;
            exit(1);
        }
        if (is_dir($newDir)) {
            echo "Component '{$new}' already exists.".PHP_EOL;
            exit(1);
        }
        rename($oldDir, $newDir);
        rename("$newDir/$old.css", "$newDir/$new.css");
        rename("$newDir/$old.js", "$newDir/$new.js");
        echo "Component renamed successfully.".PHP_EOL;
    }
    private function api(string $application, string $old, string $new): void
    {
        $oldFile = $application."/api/$old.php";
        $newFile = $application."/api/$new.php";
        if (!file_exists($oldFile)) {
            echo "API '{$old}' not found.".PHP_EOL;
            exit(1);
        }
        if (file_exists($newFile)) {
            echo "API '{$new}' already exists.".PHP_EOL;
            exit(1);
        }
        mkdir(dirname($newFile), 0777, true);
        rename($oldFile, $newFile);
        echo "API renamed successfully.".PHP_EOL;
    }
    private function database(string $application, string $old, string $new): void
    {
        $directory = $application.'/src/database';
        $files = glob($directory.'/*-'.$old.'.sql');
        if (!$files) {
            echo "Database '{$old}' not found.".PHP_EOL;
            exit(1);
        }
        $oldFile = $files[0];
        preg_match('/^(\d+)-/', basename($oldFile), $matches);
        $number = $matches[1];
        $newFile = $directory."/{$number}-{$new}.sql";
        if (file_exists($newFile)) {
            echo "Database '{$new}' already exists.".PHP_EOL;
            exit(1);
        }
        rename($oldFile, $newFile);
        echo "Database renamed successfully.".PHP_EOL;
    }
}