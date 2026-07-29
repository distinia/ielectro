<?php
namespace Nesh;
class Identifier
{
    public static function token(int $length = 32): string
    {
        return bin2hex(random_bytes($length));
    }
    public static function hash(string $token): string
    {
        return hash('sha256', $token);
    }
    public static function slug(string $table, int $bytes = 8) : string
    {
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $table)) {
            Response::error('Invalid table name');
        }
        do {
            $slug = self::token($bytes);
            $exists = Query::exists(
                "SELECT 1 FROM `$table` WHERE `slug` = ? LIMIT 1",
                [$slug]
            );
        } while ($exists);
        return $slug;
    }
}