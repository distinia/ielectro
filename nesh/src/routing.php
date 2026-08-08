<?php
namespace Nesh;

class Routing
{
    private static ?App $app = null;

    public static function bind(App $app): void
    {
        self::$app = $app;
    }

    public static function basePath(): string
    {
        return self::$app?->basePath ?? '/';
    }

    public static function path(): string
    {
        $route = trim(self::applicationPath(), '/');
        return $route === '' ? 'home' : $route;
    }

    public static function applicationPath(): string
    {
        return trim(self::normalizedApplicationPath(), '/');
    }

    public static function normalizedApplicationPath(): string
    {
        $requestPath = self::requestPath();
        $stripped = self::stripBasePath($requestPath, self::basePath());
        return self::sanitizePath($stripped);
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

    private static function requestPath(): string
    {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        if (!is_string($path) || $path === '') {
            return '/';
        }
        return self::normalizePath(rawurldecode($path));
    }

    private static function normalizePath(string $path): string
    {
        $path = str_replace('\\', '/', $path);
        if ($path === '') {
            return '/';
        }
        $path = preg_replace('#/+#', '/', $path) ?? '/';
        if ($path !== '/' && str_ends_with($path, '/')) {
            $path = rtrim($path, '/');
        }
        return $path;
    }

    private static function stripBasePath(string $path, string $basePath): string
    {
        if ($basePath === '/' || $basePath === '') {
            return $path;
        }

        $base = rtrim(str_replace('\\', '/', $basePath), '/');
        if ($base === '') {
            return $path;
        }

        if ($path === $base) {
            return '/';
        }

        $prefix = $base . '/';
        if (!str_starts_with($path, $prefix)) {
            return $path;
        }

        $remainder = substr($path, strlen($base));
        return $remainder === '' ? '/' : $remainder;
    }

    private static function sanitizePath(string $path): string
    {
        $path = self::normalizePath($path);
        $parts = explode('/', trim($path, '/'));
        $safe = [];

        foreach ($parts as $part) {
            if ($part === '' || $part === '.') {
                continue;
            }
            if ($part === '..') {
                array_pop($safe);
                continue;
            }
            $safe[] = $part;
        }

        return $safe === [] ? '/' : '/' . implode('/', $safe);
    }
}
