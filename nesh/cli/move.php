<?php
new Move();
class Move
{
    public function __construct()
    {
        echo "Moving project structure..." . PHP_EOL . PHP_EOL;
       foreach ($this->applications() as $application) {
           echo "  • {$application}" . PHP_EOL;
           $this->components($application);
            $this->pages($application);
        }
       echo PHP_EOL;
        echo "Completed successfully." . PHP_EOL;
    }
   private function applications(): array
    {
        $applications = [];
       foreach (new DirectoryIterator(ROOT_PATH) as $directory) {
           if (
                !$directory->isDir() ||
                $directory->isDot() ||
                $directory->getFilename() === 'nesh'
            ) {
                continue;
            }
           if (!is_dir($directory->getPathname() . '')) {
                continue;
            }
           $applications[] = $directory->getFilename();
        }
       sort($applications);
       return $applications;
    }
   private function components(string $application): void
    {
        $components = ROOT_PATH . "/{$application}/components";
       if (!is_dir($components)) {
            return;
        }
       foreach (glob($components . '/*', GLOB_ONLYDIR) as $directory) {
           $name = basename($directory);
           $this->move(
                "{$directory}/{$name}.js",
                ROOT_PATH . "/{$application}/scripts/layouts/{$name}.js"
            );
           $this->move(
                "{$directory}/{$name}.css",
                ROOT_PATH . "/{$application}/styles/layouts/{$name}.css"
            );
        }
    }
   private function pages(string $application): void
    {
        $pages = ROOT_PATH . "/{$application}/pages";
       if (!is_dir($pages)) {
            return;
        }
       foreach (glob($pages . '/*', GLOB_ONLYDIR) as $directory) {
           $page = basename($directory);
           $this->move(
                "{$directory}/{$page}.js",
                ROOT_PATH . "/{$application}/scripts/pages/{$page}.js"
            );
           $this->move(
                "{$directory}/{$page}.css",
                ROOT_PATH . "/{$application}/styles/{$page}/index.css"
            );
           $this->move(
                "{$directory}/{$page}.html",
                "{$pages}/{$page}.html"
            );
           $this->delete(
                "{$directory}/{$page}.json"
            );
           @rmdir($directory);
        }
    }
   private function move(string $from, string $to): void
    {
        if (!is_file($from)) {
            return;
        }
       @mkdir(dirname($to), 0755, true);
       rename($from, $to);
       echo "      Moved: {$from}" . PHP_EOL;
    }
   private function delete(string $file): void
    {
        if (!is_file($file)) {
            return;
        }
       unlink($file);
       echo "      Deleted: {$file}" . PHP_EOL;
    }
}