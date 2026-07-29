<?php
namespace Nesh;
class Url
{
    public static function current(): string
    {
        return self::protocol().'://'.$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI'];
    }
    public static function protocol(): string
    {
        return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            ? 'https'
            : 'http';
    }
    public static function host(): string
    {
        return $_SERVER['HTTP_HOST'];
    }
    public static function domain(): string
    {
        return DOMAIN;
    }
    public static function path(): string
    {
        return parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
    }
    public static function query(): string
    {
        return $_SERVER['QUERY_STRING'] ?? '';
    }
    public static function segment(int $index): ?string
    {
        $segments = self::segments();
        return $segments[$index] ?? null;
    }
    public static function segments(): array
    {
        return array_values(array_filter(
            explode('/', trim(self::path(), '/'))
        ));
    }
    public static function build(string $path = '', array $query = []): string
    {
        $url = APP_URL;
        if ($path !== '') {
            $url .= '/'.ltrim($path, '/');
        }
        if ($query !== []) {
            $url .= '?'.http_build_query($query);
        }
        return $url;
    }
    public static function redirect(string $url, int $status = 302): never
    {
        header('Location: '.$url, true, $status);
        exit;
    }
    public static function refresh(): never
    {
        self::redirect(self::current());
    }
    public static function previous(): ?string
    {
        return $_SERVER['HTTP_REFERER'] ?? null;
    }
    public static function verify(string $url): bool
    {
        return filter_var(trim($url), FILTER_VALIDATE_URL) !== false;
    }
    public static function encode(string $url): string
    {
        return rawurlencode($url);
    }
    public static function decode(string $url): string
    {
        return rawurldecode($url);
    }
}