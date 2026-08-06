<?php
namespace Nesh;
class App
{
    public Routing $routing;
    public function __construct(
        string $name,
        string $subdomain,
        string $folder,
        string $database,
        string $version = '1.0.0'
    ) {
        define('APP_VERSION', $version);
        define('APP_NAME', $name);
        define('APP_SUBDOMAIN', $subdomain);
        define('APP_FOLDER', $folder);
        define('APP_DATABASE', $database);
        define('APP_NAMESPACE', ucfirst($folder));
        define('APP_URL', 'https://' . $subdomain . '.' . DOMAIN);
        define('APP_PATH', ROOT_PATH . '/' . $folder);
        define('APP_PUBLIC', APP_PATH . '/public');
        File::makeDirectory(APP_PUBLIC);
        define('APP_API', APP_PUBLIC . '/api');
        File::makeDirectory(APP_API);
        define('APP_ASSETS', APP_PUBLIC . '/assets');
        File::makeDirectory(APP_ASSETS);
        define('APP_PAGES', APP_PUBLIC . '/pages');
        File::makeDirectory(APP_PAGES);
        define('APP_DATA', APP_PUBLIC . '/data');
        File::makeDirectory(APP_DATA);
        define('APP_CACHE', APP_PATH . '/storage/cache');
        File::makeDirectory(APP_CACHE);
        define('APP_LOGS', APP_PATH . '/storage/logs');
        File::makeDirectory(APP_LOGS);
        define('APP_TEMP', APP_PATH . '/storage/temp');
        File::makeDirectory(APP_TEMP);
        define('APP_BACKUPS', APP_PATH . '/storage/backups');
        File::makeDirectory(APP_BACKUPS);
        self::bootstrapDatabase(APP_PATH, APP_DATABASE);
        Connection::start(APP_DATABASE);
        Request::start();
        $this->routing = new Routing();
    }
    public static function bootstrapDatabase(string $appPath, string $database): void
    {
        Connection::ensureDatabase($database);
        if (!Connection::isEmpty($database)) {
            return;
        }
        $schemaPath = $appPath . '/database';
        if (!is_dir($schemaPath)) {
            return;
        }
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator(
                $schemaPath,
                \RecursiveDirectoryIterator::SKIP_DOTS
            )
        );
        $files = [];
        foreach ($iterator as $file) {
            if ($file->isFile() && strtolower($file->getExtension()) === 'sql') {
                $files[] = $file->getPathname();
            }
        }
        sort($files, SORT_NATURAL);
        foreach ($files as $file) {
            $sql = trim((string) file_get_contents($file));
            if ($sql !== '') {
                Query::multi($sql, $database);
            }
        }
    }
}
