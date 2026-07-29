<?php
namespace Nesh;
class Page
{
    private string $route;
   public function __construct()
    {
        $this->route = Request::route();
       if ($this->route === '') {
            $this->route = 'home';
        }
       if (!is_file(APP_PAGES.'/'.$this->route.'/'.$this->route.'.html')) {
            Response::notFound();
        }
       $this->generate();
    }
   private function generate(): void
    {
        echo "<!DOCTYPE html>\n";
        echo "<html lang=\"en\">";
       $this->head();
        $this->body();
       echo "\n</html>";
    }
   private function head(): void
    {
        $meta = [
            'title' => ucfirst($this->route),
            'keywords' => '',
            'description' => ''
        ];
       $json = APP_PAGES.'/'.$this->route.'/'.$this->route.'.json';
       if (is_file($json)) {
            $data = json_decode(file_get_contents($json), true);
           if (is_array($data)) {
                $meta = array_merge($meta, $data);
            }
        }
       echo '
    <head>
        <title>'.htmlspecialchars($meta['title']).' - iElectro '.htmlspecialchars(APP_NAME).'</title>
        <meta charset="'.CHARSET.'">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="author" content="iElectro">
        <meta name="keywords" content="'.htmlspecialchars($meta['keywords']).'">
        <meta name="description" content="'.htmlspecialchars($meta['description']).'">
        <link rel="icon" href="'.APP_URL.'/assets/brand/favicon.ico?v='.APP_VERSION.'">
        <link rel="stylesheet" href="'.APP_URL.'/pages/'.$this->route.'/'.$this->route.'.css?v='.APP_VERSION.'">
        <script type="module" src="'.APP_URL.'/pages/'.$this->route.'/'.$this->route.'.js?v='.APP_VERSION.'"></script>
    </head>';
    }
   private function body(): void
    {
        $html = explode("\n", trim(file_get_contents(
            APP_PAGES.'/'.$this->route.'/'.$this->route.'.html'
        )));
        foreach ($html as &$line) {
            $line = '        '.$line;
        }
        echo "\n    <body>\n";
        echo implode("\n", $html);
        echo "\n    </body>";
    }
}