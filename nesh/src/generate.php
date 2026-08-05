<?php
namespace Nesh;
class Generate
{
    public static function token(int $length = 32): string
    {
        return bin2hex(random_bytes($length));
    }
    public static function hash(string $token): string
    {
        return hash('sha256', $token);
    }
    public static function uuid(): string
    {
        return sprintf(
            '%08x-%04x-%04x-%04x-%012x',
            random_int(0, 0xffffffff),
            random_int(0, 0xffff),
            (random_int(0, 0x0fff) | 0x4000),
            (random_int(0, 0x3fff) | 0x8000),
            random_int(0, 0xffffffffffff)
        );
    }
}