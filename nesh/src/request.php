<?php
namespace Nesh;
class Request
{
    public static function start(): void
    {
        if (PHP_SAPI === 'cli') {
            return;
        }
        Security::ensure();
        self::cors(
            $_SERVER['REQUEST_METHOD'] === 'GET'
                ? ['GET', 'OPTIONS']
                : ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
        );
    }
    public static function csrf(): ?string
    {
        $header = trim((string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''));
        if ($header !== '') {
            return $header;
        }
        $token = self::value('csrf_token');
        return is_string($token) && $token !== '' ? $token : null;
    }
    public static function requireCsrf(): void
    {
        if (!Security::validate(self::csrf() ?? '')) {
            Response::forbidden('Invalid CSRF token');
        }
    }
    public static function mutate(): void
    {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        self::cors([$method, 'OPTIONS']);
        self::requireCsrf();
    }
    public static function cors(array $methods): void
    {
        $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if ($origin !== '') {
            if (!in_array($origin, CORS_ALLOWED_ORIGINS, true)) {
                Response::forbidden('Origin not allowed');
            }
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Methods: ' . implode(', ', $methods));
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
            header('Access-Control-Max-Age: 86400');
            header('Vary: Origin');
        }
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        if ($method === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
        if (!in_array($method, $methods, true)) {
            Response::methodNotAllowed();
        }
    }
    public static function body(): array
    {
        static $input = null;
        if ($input !== null) {
            return $input;
        }
        $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
        $raw = file_get_contents('php://input');
        if (str_contains($contentType, 'application/json')) {
            $decoded = json_decode($raw, true);
            $input = is_array($decoded) ? $decoded : [];
            return $input;
        }
        if (
            str_contains($contentType, 'application/x-www-form-urlencoded')
            && empty($_POST)
        ) {
            parse_str($raw, $parsed);
            $input = is_array($parsed) ? $parsed : [];
            return $input;
        }
        $input = $_POST;
        return $input;
    }
    public static function value(string $key, mixed $default = null): mixed
    {
        if (isset($_GET[$key])) {
            return $_GET[$key];
        }
        return self::body()[$key] ?? $default;
    }
    public static function file(string $key): ?array
    {
        return $_FILES[$key] ?? null;
    }
    public static function ip(): string
    {
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            return trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
        }
        return trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
    }
    public static function userAgent(): string
    {
        return trim((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''));
    }
    public static function browser(): string
    {
        $userAgent = self::userAgent();
        if (preg_match('/Edg\/([\d\.]+)/i', $userAgent, $match)) {
            return 'Microsoft Edge ' . $match[1];
        }
        if (preg_match('/OPR\/([\d\.]+)/i', $userAgent, $match)) {
            return 'Opera ' . $match[1];
        }
        if (preg_match('/Chrome\/([\d\.]+)/i', $userAgent, $match)) {
            return 'Chrome ' . $match[1];
        }
        if (preg_match('/Firefox\/([\d\.]+)/i', $userAgent, $match)) {
            return 'Firefox ' . $match[1];
        }
        if (
            preg_match('/Version\/([\d\.]+).*Safari/i', $userAgent, $match)
            && !str_contains($userAgent, 'Chrome')
        ) {
            return 'Safari ' . $match[1];
        }
        return 'Unknown';
    }
    public static function os(): string
    {
        $userAgent = self::userAgent();
        if (preg_match('/Windows NT 11/i', $userAgent)) {
            return 'Windows 11';
        }
        if (preg_match('/Windows NT 10\.0/i', $userAgent)) {
            return 'Windows 10';
        }
        if (preg_match('/Windows NT 6\.3/i', $userAgent)) {
            return 'Windows 8.1';
        }
        if (preg_match('/Windows NT 6\.2/i', $userAgent)) {
            return 'Windows 8';
        }
        if (preg_match('/Windows NT 6\.1/i', $userAgent)) {
            return 'Windows 7';
        }
        if (preg_match('/Android ([\d\.]+)/i', $userAgent, $match)) {
            return 'Android ' . $match[1];
        }
        if (preg_match('/iPhone OS ([\d_]+)/i', $userAgent, $match)) {
            return 'iOS ' . str_replace('_', '.', $match[1]);
        }
        if (preg_match('/iPad.*OS ([\d_]+)/i', $userAgent, $match)) {
            return 'iPadOS ' . str_replace('_', '.', $match[1]);
        }
        if (preg_match('/Mac OS X ([\d_]+)/i', $userAgent, $match)) {
            return 'macOS ' . str_replace('_', '.', $match[1]);
        }
        if (preg_match('/Ubuntu/i', $userAgent)) {
            return 'Ubuntu';
        }
        if (preg_match('/Linux/i', $userAgent)) {
            return 'Linux';
        }
        return 'Unknown';
    }
    public static function get(): void
    {
        self::cors(['GET', 'OPTIONS']);
    }
    public static function post(): void
    {
        self::cors(['POST', 'OPTIONS']);
    }
    public static function put(): void
    {
        self::cors(['PUT', 'OPTIONS']);
    }
    public static function delete(): void
    {
        self::cors(['DELETE', 'OPTIONS']);
    }   
    public static function patch(): void
    {
        self::cors(['PATCH', 'OPTIONS']);
    }
}