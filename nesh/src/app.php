<?php
namespace Nesh;
class App
{
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
        define('APP_PUBLIC', APP_PATH.'/public');
        define('APP_API', APP_PUBLIC.'/api');
        define('APP_ASSETS', APP_PUBLIC.'/assets');
        define('APP_PAGES', APP_PUBLIC.'/pages');
        define('APP_COMPONENTS', APP_PUBLIC.'/components');
        define('APP_DATA', APP_PUBLIC.'/data');
        define('APP_DATABASE', APP_PATH.'/database');
        define('APP_LOGS', APP_PATH.'/storage/logs');
        define('APP_TEMP', APP_PATH.'/storage/temp');
        define('APP_BACKUPS', APP_PATH.'/storage/backups');
        Connection::start();
        Request::start();
    }
}