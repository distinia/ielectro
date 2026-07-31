<?php
namespace Nesh;
class Page
{
    public string $file;
    public string $title;
    public string $keywords;
    public string $description;
    public function __construct(string $file, string $title = '', string $keywords = '', string $description = '')
    {
        $this->file = $file;
        $this->title = $title;
        $this->keywords = $keywords;
        $this->description = $description;        
    }
    public function render(): void
    {
        $this->exists();
        echo "<!DOCTYPE html>\n";
        echo "<html lang=\"en\">\n";
        $this->head();
        $this->body();
        echo "\n</html>";
    }
    private function exists(): void
    {
        if (!is_file($this->html())) {
            Response::notFound();
        }
    }
    private function head(): void
    {
        echo '
    <head>
        <title>' . htmlspecialchars($this->title) . ' - iElectro ' . htmlspecialchars(APP_NAME) . '</title>
        <meta charset="' . CHARSET . '">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="author" content="iElectro">
        <meta name="keywords" content="' . htmlspecialchars($this->keywords) . '">
        <meta name="description" content="' . htmlspecialchars($this->description) . '">
        <link rel="icon" href="' . APP_URL . '/assets/brand/favicon.ico?v=' . APP_VERSION . '">
        <link rel="stylesheet" href="' . APP_URL . '/styles/pages/' . $this->file . '.css?v=' . APP_VERSION . '">
        <script type="module" src="' . APP_URL . '/scripts/pages/' . $this->file . '.js?v=' . APP_VERSION . '"></script>
    </head>';
    }
    private function body(): void
    {
        $html = explode(
            "\n",
            trim(file_get_contents($this->html()))
        );
        foreach ($html as &$line) {
            $line = '        ' . $line;
        }
        echo "\n    <body>\n";
        echo implode("\n", $html);
        echo "\n    </body>";
    }
    private function html(): string
    {
        return APP_PAGES . '/' . $this->file . '.html';
    }
}