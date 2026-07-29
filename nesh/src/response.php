<?php
namespace Nesh;
class Response
{
    private static function send(array|string $content, int $code = 200): never
    {
        http_response_code($code);
        if (is_array($content)) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($content, \JSON_UNESCAPED_UNICODE | \JSON_UNESCAPED_SLASHES);
        } else {
            header('Content-Type: text/plain; charset=utf-8');
            echo $content;
        }
        exit;
    }
    public static function success(array|string $content = 'OK'): never
    {
        self::send($content, 200);
    }
    public static function created(array|string $content = 'Created'): never
    {
        self::send($content, 201);
    }
    public static function badRequest(array|string $content = 'Bad request'): never
    {
        self::send($content, 400);
    }
    public static function unauthorized(array|string $content = 'Unauthorized'): never
    {
        self::send($content, 401);
    }
    public static function forbidden(array|string $content = 'Forbidden'): never
    {
        self::send($content, 403);
    }
    public static function notFound(array|string $content = 'Not found'): never
    {
        self::send($content, 404);
    }
    public static function methodNotAllowed(array|string $content = 'Method not allowed'): never
    {
        self::send($content, 405);
    }
    public static function conflict(array|string $content = 'Conflict'): never
    {
        self::send($content, 409);
    }
    public static function tooManyRequests(array|string $content = 'Too many requests'): never
    {
        self::send($content, 429);
    }
    public static function error(array|string $content = 'Internal server error'): never
    {
        self::send($content, 500);
    }
}