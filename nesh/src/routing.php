<?php
namespace Nesh;
class Routing
{
    private const PUBLIC_API = [
        'user',
        'auth/login',
        'oauth/google',
        'recovery',
        'availability',
        'recovery/reset',
    ];
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
    private function session(): void
    {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $path = implode('/', array_filter([
            self::segment(1),
            self::segment(2),
        ]));
        $isPublic = in_array($path, self::PUBLIC_API, true)
            || (
                $method === 'POST'
                && self::segment(1) === 'sessions'
                && self::segment(2) === null
            );
        if ($method === 'GET') {
            if (!$isPublic) {
                Identity::required();
            }
            return;
        }
        if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            if (!$isPublic) {
                Identity::required();
                Request::requireCsrf();
            }
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
        $fileService = $service;
        if (!is_file(APP_API . "/{$fileService}.php") && str_ends_with($fileService, 's')) {
            $singular = substr($fileService, 0, -1);
            if (is_file(APP_API . "/{$singular}.php")) {
                $fileService = $singular;
            }
        }
        $file = APP_API . "/{$fileService}.php";
        if (!is_file($file)) {
            Response::notFound();
        }
        require_once $file;
        $class = APP_NAMESPACE . '\\' . Strings::className($service);
        if (!class_exists($class)) {
            $class = APP_NAMESPACE . '\\' . Strings::className($fileService);
        }
        if (!class_exists($class)) {
            Response::notFound();
        }
        $instance = new $class();
        $segment = self::segment(2);
        if (
            !$segment
            || ctype_digit((string) $segment)
            || Validate::uuid($segment)
        ) {
            $method = 'index';
        } else {
            $method = lcfirst(Strings::className($segment));
            if (!method_exists($instance, $method)) {
                $method = 'index';
            }
        }
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
        Security::ensure();
        [$page, $assets] = $this->resolvePage();
        $path = APP_PAGES . '/' . $page . '.php';
        if (!is_file($path)) {
            Response::notFound();
        }
        ob_start();
        require $path;
        $html = ob_get_clean();
        echo $this->injectPageHead($html, $assets);
    }
    private function resolvePage(): array
    {
        $segment0 = self::segment(0);
        if ($segment0 === 'article' && self::segment(1)) {
            return ['article', 'article'];
        }
        if ($segment0 === 'u' && self::segment(1)) {
            return ['profile', 'profile'];
        }
        if ($segment0 === null || $segment0 === '') {
            return ['home', 'home'];
        }
        return [$segment0, $segment0];
    }
    private function injectPageHead(string $html, string $file): string
    {
        $stylesheet = '/styles/' . $file . '/index.css';
        if (!is_file(APP_PUBLIC . $stylesheet)) {
            $stylesheet = '/styles/pages/' . $file . '.css';
        }
        $head = '    <meta charset="' . CHARSET . '">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="author" content="iElectro">
    <link rel="icon" href="' . APP_URL . '/assets/brand/favicon.ico?v=' . APP_VERSION . '">
    <link rel="stylesheet" href="' . APP_URL . $stylesheet . '?v=' . APP_VERSION . '">
    <script type="module" src="' . APP_URL . '/scripts/pages/' . $file . '.js?v=' . APP_VERSION . '"></script>';
        $html = str_replace('<head>', "<head>\n" . $head, $html);
        $html = preg_replace(
            '/<title>(.*?)<\/title>/is',
            '<title>$1 - iElectro ' . APP_NAME . '</title>',
            $html,
            1
        );
        return preg_replace_callback(
            '/<body>(.*?)<\/body>/is',
            function ($match) {
                $body = trim($match[1]);
                $lines = explode("\n", $body);
                foreach ($lines as &$line) {
                    $line = "\t" . $line;
                }
                return "<body>\n" . implode("\n", $lines) . "\n</body>";
            },
            $html,
            1
        );
    }
}
