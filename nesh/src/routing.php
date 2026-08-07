<?php
namespace Nesh;
class Routing
{
    public static function path(): string
    {
        $route = trim((string) parse_url(
                $_SERVER['REQUEST_URI'] ?? '/',
                PHP_URL_PATH
            ), '/'
        );
        return $route === '' ? 'home' : $route;
    }
    public static function method(array $methods): void
    {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if (!isset($methods[$method])) {
            Response::methodNotAllowed();
        }
        $methods[$method]();
    }
    public static function body(object $object, array $routes): void
    {
        foreach ($routes as $key => $method) {
            if (array_key_exists($key, Request::body())) {
                $object->$method();
                return;
            }
        }
        Response::badRequest('Nothing to update');
    }
    public static function segment(int $index, mixed $default = null): mixed
    {
        $segments = explode('/', self::path());
        return $segments[$index] ?? $default;
    }
    public static function id(?int $default = null): ?int
    {
        $segment = self::segment(2);
        if (is_string($segment) && ctype_digit($segment)) {
            return (int) $segment;
        }
        $messageSegment = self::segment(4);
        if (is_string($messageSegment) && ctype_digit($messageSegment)) {
            return (int) $messageSegment;
        }
        foreach (explode('/', self::path()) as $part) {
            if (ctype_digit((string) $part)) {
                return (int) $part;
            }
        }
        return $default;
    }
    public static function uuid(?string $default = null): ?string
    {
        $segment = self::segment(2);
        if (is_string($segment) && Validate::uuid($segment)) {
            return $segment;
        }
        return $default;
    }
    public static function slug(int $index = 2, ?string $default = null): ?string
    {
        $segment = self::segment($index);
        if (!is_string($segment) || $segment === '') {
            return $default;
        }
        if (ctype_digit($segment) || Validate::uuid($segment)) {
            return $default;
        }
        return $segment;
    }
}
