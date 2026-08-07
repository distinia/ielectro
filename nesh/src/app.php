<?php
namespace Nesh;
class App
{
    public string $version;
    public string $name;
    public string $subdomain;
    public string $folder;
    public string $namespace;
    public string $url;
    public array $paths;
    public Database $database;
    public Api $api;
    public Pages $pages;
    public function __construct(
        string $name,
        string $subdomain,
        string $folder,
        string $database,
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
        foreach ($this->paths as $name => $directory) {
            if ($name === 'database') {
                continue;
            }
            File::makeDirectory($directory);
        }
        $this->database = new Database($database);
        $this->database->create();
        $this->database->start();
        $this->database->tables($this->paths['database']);
        Database::$current = $this->database;
        $this->api = new Api($this);
        $this->pages = new Pages($this);
    }
    public function run(): void
    {
        match (Routing::segment(0)) {
            'api' => $this->api,
            default => $this->pages,
        };
    }
}