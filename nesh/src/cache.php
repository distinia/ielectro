<?php
namespace Nesh;
class Cache
{
    public static function has(string $key): bool
    {
        $path = self::path($key);
        if (!File::pathExists($path)) {
            return false;
        }
        $cache = self::read($path);
        if ($cache === null) {
            File::remove($path);
            return false;
        }
        if (
            $cache['expires'] !== null &&
            $cache['expires'] < time()
        ) {
            File::remove($path);
            return false;
        }
        return true;
    }
    public static function get(string $key, mixed $default = null): mixed
    {
        if (!self::has($key)) {
            return $default;
        }
        return self::read(self::path($key))['value'];
    }
    public static function set(string $key, mixed $value, ?int $ttl = 3600): bool
    {
        File::makeDirectory(CACHE_PATH);
        return File::write(
            self::path($key),
            json_encode(
                [
                    'expires' => $ttl === null
                        ? null
                        : \time() + $ttl,
                    'value' => $value
                ],
                JSON_THROW_ON_ERROR
            )
        );
    }
    public static function forever(string $key, mixed $value): bool
    {
        return self::set($key, $value, null);
    }
    public static function remember(string $key, callable $callback, ?int $ttl = 3600): mixed
    {
        if (self::has($key)) {
            return self::get($key);
        }
        $value = $callback();
        self::set($key, $value, $ttl);
        return $value;
    }
    public static function pull(string $key, mixed $default = null): mixed
    {
        $value = self::get($key, $default);
        self::delete($key);
        return $value;
    }
    public static function delete(string $key): bool
    {
        return File::remove(self::path($key));
    }
    public static function clear(): bool
    {
        return File::emptyDirectory(CACHE_PATH);
    }
    public static function expires(string $key): ?int
    {
        if (!self::has($key)) {
            return null;
        }
        return self::read(self::path($key))['expires'];
    }
    public static function extend(string $key, int $ttl): bool
    {
        if (!self::has($key)) {
            return false;
        }
        $cache = self::read(self::path($key));
        return self::set($key, $cache['value'], $ttl);
    }
    public static function increment(string $key, int $value = 1): int
    {
        $current = (int) self::get($key, 0);
        $current += $value;
        self::forever($key, $current);
        return $current;
    }
    public static function decrement(string $key, int $value = 1): int
    {
        return self::increment($key, -$value);
    }
    public static function flushExpired(): void
    {
        foreach (glob(CACHE_PATH.DIRECTORY_SEPARATOR.'*.json') as $file) {
            $cache = self::read($file);
            if (
                $cache !== null &&
                $cache['expires'] !== null &&
                $cache['expires'] < time()
            ) {
                File::remove($file);
            }
        }
    }
    private static function path(string $key): string
    {
        return rtrim(CACHE_PATH, '/\\')
           .DIRECTORY_SEPARATOR
           .sha1($key)
           .'.json';
    }
    private static function read(string $path): ?array
    {
        try {
            return json_decode(
                File::read($path),
                true,
                512,
                JSON_THROW_ON_ERROR
            );
        } catch (Throwable) {
            return null;
        }
    }
}