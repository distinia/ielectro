<?php
new Fixuse();
class Fixuse
{
    public function __construct()
    {
        $this->fixUses();
    }
    private function fixUses(): void
    {
        foreach ($this->iterator() as $file) {
            if (
                $file->getExtension() !== 'php' ||
                in_array($file->getFilename(), [
                    'bootstrap.php',
                    'autoload.php'
                ], true)
            ) {
                continue;
            }
           $code = file_get_contents($file->getPathname());
           $body = preg_replace('/^\s*<\?php\s*/', '', $code);
            $body = preg_replace('/^namespace\s+[^;]+;\R?/m', '', $body);
            $body = preg_replace('/^use\s+.+?;\R?/m', '', $body);
           $newCode = "<?php\n\nnamespace Nesh;\n\n".ltrim($body);
           if ($newCode !== $code) {
                file_put_contents($file->getPathname(), $newCode);
                echo "Updated: {$file->getFilename()}".PHP_EOL;
            }
        }
    }
    private function iterator(): RecursiveIteratorIterator
    {
        return new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(
                __DIR__ . '/../src',
                RecursiveDirectoryIterator::SKIP_DOTS
            )
        );
    }
}