<?php
namespace Nesh;
class Api
{
    private App $app;
    public array $publicApi = [];
    public function __construct(App $app)
    {
        $this->app = $app;
    }
    public function handle(): void
    {
        $this->session();
        $service = Routing::segment(1);
        if (!$service) {
            Response::notFound();
        }
        $fileService = $service;
        if (
            !is_file($this->app->paths['api'] . "/{$fileService}.php")
            && str_ends_with($fileService, 's')
        ) {
            $singular = substr($fileService, 0, -1);
            if (is_file($this->app->paths['api'] . "/{$singular}.php")) {
                $fileService = $singular;
            }
        }
        $file = $this->app->paths['api'] . "/{$fileService}.php";
        if (!is_file($file)) {
            Response::notFound();
        }
        require_once $file;
        $class = $this->app->namespace . '\\' . Strings::className($service);
        if (!class_exists($class)) {
            $class = $this->app->namespace . '\\' . Strings::className($fileService);
        }
        if (!class_exists($class)) {
            Response::notFound();
        }
        $instance = new $class();
        $segment = Routing::segment(2);
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
    private function session(): void
    {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $path = implode('/', array_filter([
            Routing::segment(1),
            Routing::segment(2),
        ]));
        $isPublic = in_array($path, $this->publicApi, true)
            || (
                $method === 'POST'
                && Routing::segment(1) === 'sessions'
                && Routing::segment(2) === null
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
}
