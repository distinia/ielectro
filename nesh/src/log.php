<?php
namespace Nesh;
class Log
{
    public static function emergency(string $message): void
    {
        self::write('emergency', $message);
    }

    public static function alert(string $message): void
    {
        self::write('alert', $message);
    }

    public static function critical(string $message): void
    {
        self::write('critical', $message);
    }

    public static function error(string $message): void
    {
        self::write('error', $message);
    }

    public static function warning(string $message): void
    {
        self::write('warning', $message);
    }

    public static function notice(string $message): void
    {
        self::write('notice', $message);
    }

    public static function info(string $message): void
    {
        self::write('info', $message);
    }

    public static function debug(string $message): void
    {
        self::write('debug', $message);
    }

    public static function exception(\Throwable $exception): void
    {
        self::error(
            sprintf(
                "%s\nFile: %s\nLine: %d\nTrace:\n%s",
                $exception->getMessage(),
                $exception->getFile(),
                $exception->getLine(),
                $exception->getTraceAsString()
            )
        );
    }

    public static function clear(): bool
    {
        return true;
    }

    private static function write(string $level, string $message): void
    {
        error_log(
            sprintf(
                '[%s] [%s] %s',
                date('Y-m-d H:i:s'),
                strtoupper($level),
                trim($message)
            )
        );
    }
}
