<?php
namespace Nesh;
class Api
{
    public function __construct(bool $session = true)
    {
        if ($session) {
            Session::required();
        }
        $this->dispatch();
    }
    private function dispatch(): void
    {
        $service = $this->service();
        $instance = $this->instance($service);
        $method = $this->action();
        $this->validate($instance, $method);
        try {
            $result = $instance->{$method}();
            Response::success($result ?? 'OK');
        } catch (\Throwable $exception) {
            Response::error($exception->getMessage());
        }
    }
    private function service(): string
    {
        $segments = explode('/', Request::route());
        if (($segments[0] ?? '') !== 'api') {
            Response::notFound();
        }
        $service = $segments[1] ?? '';
        if ($service === '') {
            Response::notFound();
        }
        return $service;
    }
    private function className(string $name): string
    {
        return str_replace(' ', '', ucwords(str_replace('-', ' ', $name)));
    }
    private function instance(string $service): object
    {
        $file = APP_API . '/' . $service . '.php';
        if (!is_file($file)) {
            Response::notFound();
        }
        require_once $file;
        $class = APP_NAMESPACE . '\\' . $this->className($service);
        if (!class_exists($class)) {
            Response::notFound();
        }
        return new $class();
    }
    private function action(): string
    {
        foreach (array_slice(explode('/', Request::route()), 2) as $segment) {
            if (!ctype_digit($segment)) {
                return lcfirst(str_replace(' ', '', ucwords(str_replace('-', ' ', $segment))));
            }
        }
        return 'index';
    }
    private function validate(object $instance, string $method): void
    {
        try {
            $reflection = new \ReflectionMethod($instance, $method);
            if (
                !$reflection->isPublic()
                || $reflection->isStatic()
            ) {
                Response::notFound();
            }
        } catch (\ReflectionException) {
            Response::notFound();
        }
    }
}