<?php
namespace Nesh;

class Avatar
{
    public const FILENAME = 'avatar.png';

    public static function accountApp(): ?App
    {
        return App::get('account');
    }

    public static function assetsRoot(): string
    {
        $app = self::accountApp();
        return $app ? $app->paths['assets'] : ROOT_PATH . '/account/assets';
    }

    public static function assetsDir(int $accountId): string
    {
        return self::assetsRoot() . '/users/' . $accountId;
    }

    public static function defaultDir(): string
    {
        return self::assetsRoot() . '/default-user';
    }

    public static function path(int $accountId): string
    {
        return self::assetsDir($accountId) . '/' . self::FILENAME;
    }

    public static function url(int $accountId): string
    {
        if ($accountId <= 0) {
            return self::defaultUrl();
        }
        $app = self::accountApp();
        $base = $app ? $app->url : 'https://account.ielectro.com';
        return $base . '/assets/users/' . $accountId . '/' . self::FILENAME;
    }

    public static function defaultUrl(): string
    {
        $app = self::accountApp();
        $base = $app ? $app->url : 'https://account.ielectro.com';
        return $base . '/assets/default-user/' . self::FILENAME;
    }

    public static function exists(int $accountId): bool
    {
        return is_file(self::path($accountId));
    }

    public static function isCustom(int $accountId): bool
    {
        if ($accountId <= 0) {
            return false;
        }
        $path = self::path($accountId);
        $default = self::defaultDir() . '/' . self::FILENAME;
        if (!is_file($path)) {
            return false;
        }
        if (!is_file($default)) {
            return true;
        }
        return md5_file($path) !== md5_file($default);
    }

    public static function provision(int $accountId): void
    {
        if ($accountId <= 0) {
            return;
        }
        $target = self::path($accountId);
        if (is_file($target)) {
            return;
        }
        $dir = self::assetsDir($accountId);
        File::makeDirectory($dir);
        $default = self::defaultDir() . '/' . self::FILENAME;
        if (is_file($default)) {
            copy($default, $target);
            return;
        }
    }

    public static function reset(int $accountId): void
    {
        if ($accountId <= 0) {
            return;
        }
        $target = self::path($accountId);
        $default = self::defaultDir() . '/' . self::FILENAME;
        File::makeDirectory(self::assetsDir($accountId));
        if (is_file($default)) {
            copy($default, $target);
            return;
        }
        if (is_file($target)) {
            unlink($target);
        }
    }

    public static function purgeStale(string $dir): void
    {
        foreach (glob($dir . '/avatar*') ?: [] as $path) {
            if (!is_file($path)) {
                continue;
            }
            if (basename($path) === self::FILENAME) {
                continue;
            }
            unlink($path);
        }
    }
}
