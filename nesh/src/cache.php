<?php
namespace Nesh;
class Cache
{
    private static array $store = [];

    public static function has(string $key): bool
    {
        $entry = self::$store[$key] ?? null;
        if ($entry === null) {
            return false;
        }
        if ($entry['expires'] !== null && $entry['expires'] < time()) {
            unset(self::$store[$key]);
            return false;
        }
        return true;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        if (!self::has($key)) {
            return $default;
        }
        return self::$store[$key]['value'];
    }

    public static function set(string $key, mixed $value, ?int $ttl = 3600): bool
    {
        self::$store[$key] = [
            'expires' => $ttl === null ? null : time() + $ttl,
            'value' => $value,
        ];
        return true;
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
        unset(self::$store[$key]);
        return true;
    }

    public static function clear(): bool
    {
        self::$store = [];
        return true;
    }

    public static function expires(string $key): ?int
    {
        if (!self::has($key)) {
            return null;
        }
        return self::$store[$key]['expires'];
    }

    public static function extend(string $key, int $ttl): bool
    {
        if (!self::has($key)) {
            return false;
        }
        return self::set($key, self::$store[$key]['value'], $ttl);
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
        $now = time();
        foreach (self::$store as $key => $entry) {
            if ($entry['expires'] !== null && $entry['expires'] < $now) {
                unset(self::$store[$key]);
            }
        }
    }
}
