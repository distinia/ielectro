<?php
namespace Nesh;
class App
{
    private static array $apps = [];
    public string $version;
    public string $name;
    public string $url;
    public string $basePath;
    public string $folder;
    public string $namespace;
    public array $paths;
    public ?string $database = null;
    public Api $api;
    public Pages $pages;
    public function __construct(
        string $name,
        string $url,
        string $folder,
        ?string $databaseName = null,
        string $version = '1.0.0'
    ) {
        $this->version = $version;
        $this->name = $name;
        $this->folder = $folder;
        $this->namespace = ucfirst($folder);
        $this->url = self::normalizeUrl($url);
        $this->basePath = self::basePathFromUrl($this->url);
        $this->paths = [
            'root'     => ROOT_PATH . '/' . $folder,
            'api'      => ROOT_PATH . '/' . $folder . '/api',
            'assets'   => ROOT_PATH . '/' . $folder . '/assets',
            'pages'    => ROOT_PATH . '/' . $folder . '/pages',
            'data'     => ROOT_PATH . '/' . $folder . '/data',
            'database' => ROOT_PATH . '/' . $folder . '/database',
        ];
        foreach ($this->paths as $pathName => $directory) {
            if ($pathName === 'database') {
                continue;
            }
            File::makeDirectory($directory);
        }
        $this->database = $databaseName;
        $this->boot();
        $this->api = new Api($this);
        $this->pages = new Pages($this);
        self::$apps[$this->folder] = $this;
    }
    public function run(): void
    {
        Routing::bind($this);
        $this->bindEnvironment();
        match (Routing::segment(0)) {
            'api' => $this->api->handle(),
            default => $this->pages->render(),
        };
    }
    private function bindEnvironment(): void
    {
        if (!defined('APP_URL')) {
            define('APP_URL', $this->url);
        }
        if (!defined('APP_BASE_PATH')) {
            define('APP_BASE_PATH', $this->basePath);
        }
        if (!defined('APP_ASSETS')) {
            define('APP_ASSETS', $this->paths['assets']);
        }
        if (!defined('APP_PUBLIC')) {
            define('APP_PUBLIC', $this->paths['root']);
        }
    }
    private function boot(): void
    {
        $boot = $this->paths['root'] . '/.booted';
        if (is_file($boot)) {
            return;
        }
        if ($this->database !== null) {
            Database::create($this->database);
            Database::tables(
                $this->database,
                $this->paths['database']
            );
        }
        if (!touch($boot)) {
            Response::error('Unable to create boot file.');
        }
    }
    private static function normalizeUrl(string $url): string
    {
        $url = trim($url);
        if ($url === '') {
            Response::error('Invalid application URL');
        }
        return rtrim($url, '/');
    }
    private static function basePathFromUrl(string $url): string
    {
        $path = parse_url($url, PHP_URL_PATH);
        if (!is_string($path) || $path === '' || $path === '/') {
            return '/';
        }
        return '/' . trim($path, '/') . '/';
    }
    public static function all(): array
    {
        return array_values(self::$apps);
    }
    public static function get(string $identifier): ?self
    {
        $identifier = strtolower(trim($identifier));
        foreach (self::$apps as $folder => $app) {
            if (strtolower($folder) === $identifier) {
                return $app;
            }
        }
        return null;
    }
    public static function withDatabase(): array
    {
        return array_values(array_filter(
            self::$apps,
            static fn(self $app): bool => $app->database !== null
        ));
    }
}
