<?php
namespace Nesh;
class Validate
{
    public static function required(mixed $value): bool
    {
        if (is_string($value)) {
            $value = trim($value);
        }
        return $value !== null && $value !== '';
    }
    public static function email(mixed $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
    }
    public static function username(mixed $value): bool
    {
        return is_string($value)
            && preg_match('/^[a-z0-9_.-]+$/', trim($value)) === 1;
    }
    public static function min(mixed $value, int $length): bool
    {
        return mb_strlen(trim((string) $value)) >= $length;
    }
    public static function max(mixed $value, int $length): bool
    {
        return mb_strlen(trim((string) $value)) <= $length;
    }
    public static function same(mixed $value1, mixed $value2): bool
    {
        return (string) $value1 === (string) $value2;
    }
    public static function integer(mixed $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_INT) !== false;
    }
    public static function boolean(mixed $value): bool
    {
        return is_bool($value)
            || $value === 0
            || $value === 1
            || $value === '0'
            || $value === '1'
            || $value === 'true'
            || $value === 'false';
    }
    public static function date(mixed $value): bool
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $value)) {
            return false;
        }
        $parts = explode('-', (string) $value);
        return count($parts) === 3
            && checkdate(
                (int) $parts[1],
                (int) $parts[2],
                (int) $parts[0]
            );
    }
    public static function url(mixed $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_URL) !== false;
    }
    public static function ip(mixed $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_IP) !== false;
    }
    public static function json(mixed $value): bool
    {
        if (!is_string($value)) {
            return false;
        }
        json_decode($value);
        return json_last_error() === JSON_ERROR_NONE;
    }
    public static function uuid(mixed $value): bool
    {
        return is_string($value)
            && preg_match(
                '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
                $value
            ) === 1;
    }
    public static function in(mixed $value, array $values): bool
    {
        return in_array($value, $values, true);
    }
    public static function phone(mixed $value): bool
    {
        return is_string($value) && preg_match('/^\+\d{1,3}\s\d{6,14}$/', trim($value)) === 1;
    }
}