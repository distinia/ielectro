<?php
namespace Nesh;
class App
{
    private static array $apps = [];
    public string $version;
    public string $name;
    public string $subdomain;
    public string $folder;
    public string $namespace;
    public string $url;
    public array $paths;
    public ?Database $database = null;
    public Api $api;
    public Pages $pages;
    private bool $booted = false;
    public function __construct(
        string $name,
        string $subdomain,
        string $folder,
        ?string $databaseName  = null,
        string $version = '1.0.0'
    ) {
        $this->version = $version;
        $this->name = $name;
        $this->subdomain = $subdomain;
        $this->folder = $folder;
        $this->namespace = ucfirst($folder);
        $this->url = 'https://' . $subdomain . '.' . DOMAIN;
        $this->paths = [
            'root'      => ROOT_PATH . '/' . $folder,
            'public'    => ROOT_PATH . '/' . $folder . '/public',
            'api'       => ROOT_PATH . '/' . $folder . '/public/api',
            'assets'    => ROOT_PATH . '/' . $folder . '/public/assets',
            'pages'     => ROOT_PATH . '/' . $folder . '/public/pages',
            'data'      => ROOT_PATH . '/' . $folder . '/public/data',
            'storage'   => ROOT_PATH . '/' . $folder . '/storage',
            'cache'     => ROOT_PATH . '/' . $folder . '/storage/cache',
            'logs'      => ROOT_PATH . '/' . $folder . '/storage/logs',
            'temp'      => ROOT_PATH . '/' . $folder . '/storage/temp',
            'backups'   => ROOT_PATH . '/' . $folder . '/storage/backups',
            'database'  => ROOT_PATH . '/' . $folder . '/database',
        ];
        foreach ($this->paths as $pathName => $directory) {
            if ($pathName === 'database') {
                continue;
            }
            File::makeDirectory($directory);
        }
        if($databaseName !== null){
            $this->database = new Database($databaseName);
        }
        $this->api = new Api($this);
        $this->pages = new Pages($this);
        self::$apps[$this->folder] = $this;
    }
    public function run(): void
    {
        $this->boot();
        if ($this->database !== null) {
            $this->database->use();
        }
        match (Routing::segment(0)) {
            'api' => $this->api->handle(),
            default => $this->pages->render(),
        };
    }
    private function boot(): void
    {
        if ($this->booted) {
            return;
        }
        if ($this->database !== null) {
            $this->database->create();
            $this->database->tables($this->paths['database']);
        }
        $this->booted = true;
    }
    public static function get(string $name): ?App
    {
        return self::$apps[$name] ?? null;
    }
}
