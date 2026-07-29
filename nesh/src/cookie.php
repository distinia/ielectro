<?php
namespace Nesh;
class Cookie
{
    public static function secure(): bool
    {
        if (COOKIE_SECURE === false) {
            return false;
        }
        return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || ((int) ($_SERVER['SERVER_PORT'] ?? 80) === 443);
    }
    public static function options(int $expires, ?bool $httpOnly = null): array
    {
        $httpOnly ??= COOKIE_HTTPONLY;
        return [
            'expires' => $expires,
            'path' => COOKIE_PATH,
            'domain' => COOKIE_DOMAIN,
            'secure' => self::secure(),
            'httponly' => $httpOnly,
            'samesite' => COOKIE_SAMESITE,
        ];
    }
    public static function set(
        string $name,
        string $value,
        int $expires,
        ?bool $httpOnly = null
    ): bool {
        $_COOKIE[$name] = $value;
        return setcookie(
            $name,
            $value,
            self::options($expires, $httpOnly)
        );
    }
    public static function delete(string $name): bool
    {
        unset($_COOKIE[$name]);
        return setcookie(
            $name,
            '',
            self::options(time() - 3600)
        );
    }
    public static function has(string $name): bool
    {
        return isset($_COOKIE[$name]);
    }
    public static function get(string $name): ?string
    {
        if (!isset($_COOKIE[$name])) {
            return null;
        }
        $value = trim($_COOKIE[$name]);
        return $value === '' ? null : $value;
    }
}