<?php
namespace Nesh;
class Routing
{
    private const PUBLIC_API = [
        'user',
        'auth/login',
        'oauth/google',
        'recovery',
        'recovery/reset',
    ];
    public Collection $pages;
    public function __construct()
    {
        $this->pages = new Collection();
    }
    public static function get(): void
    {
        Request::cors(['GET', 'OPTIONS']);
    }
    public static function post(): void
    {
        Request::cors(['POST', 'OPTIONS']);
    }
    public static function put(): void
    {
        Request::cors(['PUT', 'OPTIONS']);
    }
    public static function delete(): void
    {
        Request::cors(['DELETE', 'OPTIONS']);
    }   
    public static function patch(): void
    {
        Request::cors(['PATCH', 'OPTIONS']);
    }
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
        foreach (explode('/', self::path()) as $segment) {
            if (ctype_digit($segment)) {
                return (int) $segment;
            }
        }
        return $default;
    }
    private function session(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Session::required();
            return;
        }
        $path = implode('/', array_filter([
            self::segment(1),
            self::segment(2),
        ]));
        if (!in_array($path, self::PUBLIC_API, true)) {
            Session::required();
        }
    }
    public function run(): void
    {
        match (self::segment(0)) {
            'api' => $this->loadApi(),
            default => $this->loadPage(),
        };
    }
    private function loadApi(): void
    {
        $this->session();
        $service = self::segment(1);
        if (!$service) {
            Response::notFound();
        }
        $file = APP_API . "/{$service}.php";
        if (!is_file($file)) {
            Response::notFound();
        }
        require_once $file;
        $class = APP_NAMESPACE . '\\' . Strings::className($service);
        if (!class_exists($class)) {
            Response::notFound();
        }
        $instance = new $class();
        $method = self::segment(2)
            ? lcfirst(Strings::className(self::segment(2)))
            : 'index';
        if (!method_exists($instance, $method)) {
            Response::notFound();
        }
        $result = $instance->$method();
        if ($result !== null) {
            Response::success($result);
        }
    }
    private function loadPage(): void
    {
        $route = self::path();
        foreach ($this->pages as $page) {
            if ($page->file === $route) {
                $page->render();
                return;
            }
        }
    }
}