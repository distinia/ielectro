<?php
namespace Nesh;
class Arrays
{
    public static function get(array $array, string|int $key, mixed $default = null): mixed
    {
        if (is_int($key) || !str_contains($key, '.')) {
            return $array[$key] ?? $default;
        }
        foreach (explode('.', $key) as $segment) {
            if (!is_array($array) || !array_key_exists($segment, $array)) {
                return $default;
            }
            $array = $array[$segment];
        }
        return $array;
    }
    public static function has(array $array, string|int $key): bool
    {
        return self::get($array, $key) !== null;
    }
    public static function set(array &$array, string|int $key, mixed $value): void
    {
        if (is_int($key) || !str_contains($key, '.')) {
            $array[$key] = $value;
            return;
        }
        $keys = explode('.', $key);
        $current = &$array;
        foreach ($keys as $segment) {
            if (!isset($current[$segment]) || !is_array($current[$segment])) {
                $current[$segment] = [];
            }
            $current = &$current[$segment];
        }
        $current = $value;
    }
    public static function remove(array &$array, string|int $key): void
    {
        if (is_int($key) || !str_contains($key, '.')) {
            unset($array[$key]);
            return;
        }
        $keys = explode('.', $key);
        $current = &$array;
        while (count($keys) > 1) {
            $segment = array_shift($keys);
            if (!isset($current[$segment]) || !is_array($current[$segment])) {
                return;
            }
            $current = &$current[$segment];
        }
        unset($current[array_shift($keys)]);
    }
    public static function first(array $array): mixed
    {
        return reset($array);
    }
    public static function last(array $array): mixed
    {
        return end($array);
    }
    public static function keys(array $array): array
    {
        return array_keys($array);
    }
    public static function values(array $array): array
    {
        return array_values($array);
    }
    public static function merge(array ...$arrays): array
    {
        return array_merge(...$arrays);
    }
    public static function filter(array $array, ?callable $callback = null): array
    {
        return array_filter($array, $callback);
    }
    public static function map(array $array, callable $callback): array
    {
        return array_map($callback, $array);
    }
    public static function reverse(array $array): array
    {
        return array_reverse($array);
    }
    public static function unique(array $array): array
    {
        return array_unique($array);
    }
    public static function contains(array $array, mixed $value): bool
    {
        return in_array($value, $array, true);
    }
    public static function random(array $array): mixed
    {
        if ($array === []) {
            return null;
        }
        return $array[array_rand($array)];
    }
    public static function shuffle(array $array): array
    {
        shuffle($array);
        return $array;
    }
    public static function chunk(array $array, int $length): array
    {
        return array_chunk($array, $length);
    }
    public static function flatten(array $array): array
    {
        $result = [];
        array_walk_recursive($array, static function ($value) use (&$result) {
            $result[] = $value;
        });
        return $result;
    }
    public static function verify(mixed $value): bool
    {
        return is_array($value);
    }
}