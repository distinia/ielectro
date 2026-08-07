<?php
namespace Nesh;
class Server
{
    private App $app;
    private array $protected = ['database', 'storage', 'data',];
    public function __construct(App $app)
    {
        $this->app = $app;
    }
    public function protect(array $paths): static
    {
        foreach ($paths as $path) {
            $path = trim($path, '/\\');
            if (
                $path !== '' &&
                !in_array($path, $this->protected, true)
            ) {
                $this->protected[] = $path;
            }
        }
        return $this;
    }
    public function save(): void
    {
        $lines = [
            'DirectoryIndex index.php',
            'RewriteEngine On',
            '',
        ];
        foreach ($this->protected as $path) {
            $lines[] = sprintf(
                'RewriteRule ^%s(?:/.*)?$ - [F,L,NC]',
                preg_quote($path, '#')
            );
        }
        $lines[] = '';
        $lines[] = 'RewriteCond %{REQUEST_FILENAME} -f';
        $lines[] = 'RewriteRule ^ - [L]';
        $lines[] = 'RewriteRule ^ index.php [L,QSA]';
        $path = $this->app->paths['root'] . '/.htaccess';
        if (file_put_contents($path, implode(PHP_EOL, $lines) . PHP_EOL) === false) {
            Response::error('Unable to write .htaccess.');
        }
    }
}