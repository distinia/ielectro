<?php
namespace Nesh;
class Connection
{
    private static ?\mysqli $conn = null;
    public static function start(): \mysqli
    {
        if (self::$conn instanceof \mysqli) {
            return self::$conn;
        }
        self::$conn = mysqli_connect(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if (!self::$conn) {
            Response::error('Connection error');
        }
        if (!mysqli_set_charset(self::$conn, DB_CHARSET)) {
            Response::error('Charset error');
        }
        return self::$conn;
    }
    public static function close(): void
    {
        if (self::$conn instanceof \mysqli) {
            mysqli_close(self::$conn);
            self::$conn = null;
        }
    }
}