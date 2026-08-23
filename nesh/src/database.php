<?php
namespace Nesh;
class Database
{
    private static ?\mysqli $server = null;
    public static function start(): \mysqli
    {
        if (self::$server instanceof \mysqli) {
            return self::$server;
        }
        self::$server = self::connect();
        if (!self::$server) {
            Response::error('Database connection error');
        }
        return self::$server;
    }
    public static function create(string $name): void
    {
        if (self::databaseAccessible($name)) {
            return;
        }
        $server = self::connect();
        if (!$server) {
            Response::error('Server connection error');
        }
        $database = str_replace('`', '``', $name);
        $sql = sprintf(
            "CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET %s COLLATE utf8mb4_unicode_ci",
            $database
        );
        if (!mysqli_query($server, $sql) || !self::databaseAccessible($name)) {
            mysqli_close($server);
            Response::error('Database creation error');
        }
        mysqli_close($server);
    }
    public static function tables(string $database, string $path): void
    {
        $server = self::start();
        $database = str_replace('`', '``', $database);
        $result = mysqli_query(
            $server,
            "SHOW TABLES FROM `{$database}`"
        );
        if (!$result) {
            Response::error('Database inspection error');
        }
        if (mysqli_num_rows($result) > 0) {
            mysqli_free_result($result);
            return;
        }
        mysqli_free_result($result);
        if (!is_dir($path)) {
            return;
        }
        $files = glob($path . '/*.sql');
        if (!$files) {
            return;
        }
        sort($files, SORT_NATURAL);
        foreach ($files as $file) {
            $sql = trim(file_get_contents($file));
            if ($sql === '') {
                continue;
            }
            if (!mysqli_multi_query($server, $sql)) {
                Response::error(
                    'SQL error in "' . basename($file) . '"'
                );
            }
            do {
                if ($result = mysqli_store_result($server)) {
                    mysqli_free_result($result);
                }
            } while (
                mysqli_more_results($server)
                && mysqli_next_result($server)
            );
        }
    }
    public static function close(): void
    {
        if (self::$server instanceof \mysqli) {
            mysqli_close(self::$server);
            self::$server = null;
        }
    }
    private static function connect(): \mysqli|false
    {
        return mysqli_connect(DB_HOST, DB_USER, DB_PASS);
    }
    private static function databaseAccessible(string $name): bool
    {
        $connection = @mysqli_connect(
            DB_HOST,
            DB_USER,
            DB_PASS,
            $name
        );
        if (!$connection) {
            return false;
        }
        mysqli_close($connection);
        return true;
    }
}