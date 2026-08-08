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
    public string $basePath;
    public array $paths;
    public ?string $database = null;
    public Api $api;
    public Pages $pages;

    public function __construct(
        string $name,
        string $subdomain,
        string $folder,
        ?string $databaseName = null,
        string $version = '1.0.0'
    ) {
        $this->version = $version;
        $this->name = $name;
        $this->subdomain = $subdomain;
        $this->folder = $folder;
        $this->namespace = ucfirst($folder);
        $this->basePath = $this->resolveBasePath();
        $this->url = $this->resolveUrl();

        $this->paths = [
            'root'     => ROOT_PATH . '/' . $folder,
            'api'      => ROOT_PATH . '/' . $folder . '/api',
            'assets'   => ROOT_PATH . '/' . $folder . '/assets',
            'pages'    => ROOT_PATH . '/' . $folder . '/pages',
            'data'     => ROOT_PATH . '/' . $folder . '/data',
            'storage'  => ROOT_PATH . '/' . $folder . '/storage',
            'cache'    => ROOT_PATH . '/' . $folder . '/storage/cache',
            'logs'     => ROOT_PATH . '/' . $folder . '/storage/logs',
            'temp'     => ROOT_PATH . '/' . $folder . '/storage/temp',
            'backups'  => ROOT_PATH . '/' . $folder . '/storage/backups',
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

        if (!defined('APP_CACHE')) {
            define('APP_CACHE', $this->paths['cache']);
        }

        if (!defined('APP_LOGS')) {
            define('APP_LOGS', $this->paths['logs']);
        }

        if (!defined('APP_TEMP')) {
            define('APP_TEMP', $this->paths['temp']);
        }
    }

    private function boot(): void
    {
        $boot = $this->paths['storage'] . '/.booted';

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

    private function resolveBasePath(): string
    {
        $scriptDir = str_replace(
            '\\',
            '/',
            dirname($_SERVER['SCRIPT_NAME'] ?? '/index.php')
        );

        if ($scriptDir === '/' || $scriptDir === '.' || $scriptDir === '') {
            return '/';
        }

        return rtrim($scriptDir, '/');
    }

    private function resolveUrl(): string
    {
        $configured = 'https://' . $this->subdomain . '.' . DOMAIN;

        if (PHP_SAPI === 'cli') {
            return $configured;
        }

        $host = trim((string) ($_SERVER['HTTP_HOST'] ?? ''));
        $configuredHost = parse_url($configured, PHP_URL_HOST);

        if ($this->basePath === '/' && $host === $configuredHost) {
            return $configured;
        }

        $protocol = (
            !empty($_SERVER['HTTPS'])
            && $_SERVER['HTTPS'] !== 'off'
        ) ? 'https' : 'http';

        if ($host === '') {
            return $configured;
        }

        return $protocol . '://' . $host . (
            $this->basePath === '/' ? '' : $this->basePath
        );
    }
}