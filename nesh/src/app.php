<?php
namespace Nesh;
class App
{
    public Routing $routing;
    public function __construct(string $name, string $version = '1.0.0')
    {
        $name = ucfirst(trim($name));
        if ($name === '') {
            Response::error('Invalid application name');
        }
        $directory = strtolower($name);
        define('APP_VERSION', $version);
        define('APP_NAMESPACE', $name);
        define('APP_NAME', $directory === 'www' ? '' : $name);
        define('APP_URL', 'https://'.$directory.'.'.DOMAIN);
        define('APP_PATH', ROOT_PATH.'/'.$directory);
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
        define('APP_DATABASE', APP_PATH . '/database');
        File::makeDirectory(APP_DATABASE);
        define('APP_CACHE', APP_PATH . '/storage/cache');
        File::makeDirectory(APP_CACHE);
        define('APP_LOGS', APP_PATH . '/storage/logs');
        File::makeDirectory(APP_LOGS);
        define('APP_TEMP', APP_PATH . '/storage/temp');
        File::makeDirectory(APP_TEMP);
        define('APP_BACKUPS', APP_PATH . '/storage/backups');
        File::makeDirectory(APP_BACKUPS);
        Connection::start();
        Request::start();
        $this->routing = new Routing();
    }
}