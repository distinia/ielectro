<?php
namespace Nesh;
class Strings
{
    public static function normalize(mixed $string): ?string
    {
        if (!is_string($string)) {
            return null;
        }
        $string = trim($string);
        if ($string === '') {
            return null;
        }
        return mb_strtolower($string, CHARSET);
    }
    public static function length(string $string): int
    {
        return mb_strlen($string, CHARSET);
    }
    public static function upper(string $string): string
    {
        return mb_strtoupper($string, CHARSET);
    }
    public static function lower(string $string): string
    {
        return mb_strtolower($string, CHARSET);
    }
    public static function title(string $string): string
    {
        return mb_convert_case($string, MB_CASE_TITLE, CHARSET);
    }
    public static function capitalize(string $string): string
    {
        return mb_strtoupper(mb_substr($string, 0, 1, CHARSET), CHARSET)
           .mb_substr($string, 1, null, CHARSET);
    }
    public static function contains(string $string, string $search): bool
    {
        return str_contains($string, $search);
    }
    public static function startsWith(string $string, string $search): bool
    {
        return str_starts_with($string, $search);
    }
    public static function endsWith(string $string, string $search): bool
    {
        return str_ends_with($string, $search);
    }
    public static function replace(string|array $search, string|array $replace, string $string): string
    {
        return str_replace($search, $replace, $string);
    }
    public static function substring(string $string, int $start, ?int $length = null): string
    {
        return mb_substr($string, $start, $length, CHARSET);
    }
    public static function reverse(string $string): string
    {
        return implode('', array_reverse(mb_str_split($string)));
    }
    public static function repeat(string $string, int $times): string
    {
        return str_repeat($string, $times);
    }
    public static function padLeft(string $string, int $length, string $pad = ' '): string
    {
        return str_pad($string, $length, $pad, STR_PAD_LEFT);
    }
    public static function padRight(string $string, int $length, string $pad = ' '): string
    {
        return str_pad($string, $length, $pad, STR_PAD_RIGHT);
    }
    public static function random(int $length = 32): string
    {
        return substr(bin2hex(random_bytes((int) ceil($length / 2))), 0, $length);
    }
    public static function verify(mixed $string): bool
    {
        return is_string($string);
    }
    public static function className(string $string): string
    {
        return str_replace(' ', '', self::title(str_replace(['-', '_'], ' ', $string)));
    }
}