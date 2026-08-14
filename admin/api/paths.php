<?php
namespace Admin;

use Nesh\App;
use Nesh\Avatar;
use Nesh\File;

if (!defined('ADMIN_ROOT')) {
    define('ADMIN_ROOT', dirname(__DIR__));
}

final class MediaPaths
{
    public static function wwwAssets(): string
    {
        $app = App::get('www');
        return $app ? $app->paths['assets'] : dirname(ADMIN_ROOT) . '/www/assets';
    }

    public static function wwwUrl(): string
    {
        $app = App::get('www');
        return $app ? $app->url : 'https://www.ielectro.com';
    }

    public static function adminAssets(): string
    {
        return ADMIN_ROOT . '/assets';
    }

    public static function newsDir(): string
    {
        $path = self::wwwAssets() . '/news';
        File::makeDirectory($path);
        return $path;
    }

    public static function newsUrl(?string $filename): ?string
    {
        if ($filename === null || $filename === '') {
            return null;
        }
        if (preg_match('#^https?://#i', $filename)) {
            return $filename;
        }
        return self::wwwUrl() . '/assets/news/' . rawurlencode(basename($filename));
    }

    public static function applicationsDir(): string
    {
        $path = self::adminAssets() . '/applications';
        File::makeDirectory($path);
        return $path;
    }

    public static function applicationUrl(?string $filename): ?string
    {
        if ($filename === null || $filename === '') {
            return null;
        }
        return APP_URL . '/assets/applications/' . rawurlencode(basename($filename));
    }

    public static function teamAvatarUrl(?int $accountId): ?string
    {
        if ($accountId === null || $accountId <= 0) {
            return null;
        }
        return Avatar::url($accountId);
    }
}
