<?php
new Reparecss();
class Reparecss
{
    public function __construct()
    {
        foreach ($this->applications() as $application) {
            foreach ($this->iterator($application) as $file) {
                if ($file->getExtension() !== 'css') {
                    continue;
                }
                $path = $file->getPathname();
                $directory = dirname($path);
                $code = file_get_contents($path);
                $code = preg_replace_callback(
                    '/@import\s+"https?:\/\/[^\/"]+\/components\/([^\/"]+)\/[^"]+\.css(?:\?[^"]*)?";/i',
                    static function ($match): string {
                        return '@import "../'.$match[1].'/'.$match[1].'.css";';
                    },
                    $code
                );
                file_put_contents($path, $code);
                echo "Updated: {$path}" . PHP_EOL;
            }
        }
    }
    private function relativePath(string $from, string $to): string
    {
        $from = explode('/', str_replace('\\', '/', realpath($from)));
        $toFile = basename($to);
        $to = explode('/', str_replace('\\', '/', realpath(dirname($to))));
        while ($from && $to && $from[0] === $to[0]) {
            array_shift($from);
            array_shift($to);
        }
        return str_repeat('../', count($from))
            . implode('/', $to)
            . '/' . $toFile;
    }
    private function applications(): array
    {
        $applications = [];
        foreach (new DirectoryIterator(ROOT_PATH) as $directory) {
            if (
                !$directory->isDir() ||
                $directory->isDot() ||
                strtolower($directory->getFilename()) === 'nesh'
            ) {
                continue;
            }
            $public = $directory->getPathname() . '/public';
            if (is_dir($public)) {
                $applications[] = $public;
            }
        }
        sort($applications);
        return $applications;
    }
    private function iterator(string $directory): RecursiveIteratorIterator
    {
        return new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(
                $directory,
                RecursiveDirectoryIterator::SKIP_DOTS
            )
        );
    }
}