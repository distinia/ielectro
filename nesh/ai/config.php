<?php
namespace Nesh\Ai;

class Config
{
    public static function boot(): void
    {
        if (defined('LLM_PROVIDER')) {
            return;
        }

        $path = self::localPath();
        if (is_file($path)) {
            require_once $path;
            return;
        }

        self::defineDefaults();
    }

    public static function localPath(): string
    {
        return NESH_AI . '/config.local.php';
    }

    public static function examplePath(): string
    {
        return NESH_AI . '/config.example.php';
    }

    public static function provider(): string
    {
        $value = strtolower(self::value('LLM_PROVIDER'));
        return $value !== '' ? $value : 'custom';
    }

    public static function model(): string
    {
        return self::value('LLM_MODEL');
    }

    public static function fastModel(): string
    {
        return self::value('LLM_MODEL_FAST');
    }

    public static function apiKey(): string
    {
        return self::value('LLM_API_KEY');
    }

    public static function baseUrl(): string
    {
        return rtrim(self::value('LLM_BASE_URL'), '/');
    }

    public static function chatPath(): string
    {
        $path = self::value('LLM_CHAT_PATH', '/chat/completions');
        return str_starts_with($path, '/') ? $path : '/' . $path;
    }

    public static function requestPauseMs(): int
    {
        return self::integer('LLM_REQUEST_PAUSE_MS', 900);
    }

    private static function value(string $name, string $default = ''): string
    {
        self::boot();
        if (!defined($name)) {
            return $default;
        }
        return trim((string) constant($name));
    }

    private static function integer(string $name, int $default): int
    {
        self::boot();
        if (!defined($name)) {
            return $default;
        }
        return (int) constant($name);
    }

    private static function defineDefaults(): void
    {
        define('LLM_PROVIDER', 'custom');
        define('LLM_BASE_URL', '');
        define('LLM_MODEL', '');
        define('LLM_MODEL_FAST', '');
        define('LLM_API_KEY', '');
    }
}
