<?php
namespace Nesh;
class Pages
{
    private App $app;
    public function __construct(App $app)
    {
        $this->app = $app;
    }
    public function render(): void
    {
        Security::ensure();
        $page = Routing::path() === 'home'
            ? 'home'
            : Routing::segment(0);
        $path = $this->app->paths['pages'] . '/' . $page . '.html';
        if (!is_file($path)) {
            Response::notFound();
        }
        $html = file_get_contents($path);
        if ($html === false) {
            Response::notFound();
        }
        echo $this->injectHead($html, $page);
    }
    private function injectHead(string $html, string $file): string
    {
        $stylesheet = '/styles/' . $file . '/index.css';
        if (!is_file($this->app->paths['root'] . $stylesheet)) {
            $stylesheet = '/styles/' . $file . '/index.css';
        }
        $head = '    <meta charset="' . CHARSET . '">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="author" content="iElectro">
    <link rel="icon" href="' . $this->app->url . '/assets/brand/favicon.ico?v=' . $this->app->version . '">
    <link rel="stylesheet" href="' . $this->app->url . $stylesheet . '?v=' . $this->app->version . '">
    <script type="module" src="' . $this->app->url . '/scripts/' . $file . '/index.js?v=' . $this->app->version . '"></script>';
        $html = str_replace('<head>', "<head>\n" . $head, $html);
        $html = preg_replace(
            '/<title>(.*?)<\/title>/is',
            '<title>$1 - ' . $this->app->name . '</title>',
            $html,
            1
        );
        return preg_replace_callback(
            '/<body>(.*?)<\/body>/is',
            function ($match) {
                $body = trim($match[1]);
                $lines = explode("\n", $body);
                foreach ($lines as &$line) {
                    $line = "\t" . $line;
                }
                $spinner = "\t" . '<div id="page-boot-spinner" class="page-spinner-overlay" role="status" aria-label="Loading">'
                    . '<div class="page-spinner"><div class="page-spinner__ring"></div></div></div>';
                return "<body class=\"page-is-loading\">\n" . $spinner . "\n" . implode("\n", $lines) . "\n</body>";
            },
            $html,
            1
        );
    }
}
