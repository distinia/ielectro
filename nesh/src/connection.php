<?php
namespace Nesh;
class Connection
{
    private static ?\mysqli $server = null;
    /** @var array<string, \mysqli> */
    private static array $connections = [];
    public static function start(?string $database = null): \mysqli
    {
        if (!defined('APP_DATABASE')) {
            Response::error('Application database not configured');
        }
        $database = $database ?? APP_DATABASE;
        self::validateIdentifier($database, 'database');
        if (isset(self::$connections[$database])) {
            return self::$connections[$database];
        }
        self::ensureDatabase($database);
        $connection = mysqli_connect(DB_HOST, DB_USER, DB_PASS, $database, DB_PORT);
        if (!$connection) {
            Response::error('Connection error');
        }
        if (!mysqli_set_charset($connection, DB_CHARSET)) {
            Response::error('Charset error');
        }
        self::$connections[$database] = $connection;
        return $connection;
    }
    public static function server(): \mysqli
    {
        if (self::$server instanceof \mysqli) {
            return self::$server;
        }
        self::$server = mysqli_connect(DB_HOST, DB_USER, DB_PASS, '', DB_PORT);
        if (!self::$server) {
            Response::error('Connection error');
        }
        if (!mysqli_set_charset(self::$server, DB_CHARSET)) {
            Response::error('Charset error');
        }
        return self::$server;
    }
    public static function ensureDatabase(string $database): void
    {
        self::validateIdentifier($database, 'database');
        $sql = 'CREATE DATABASE IF NOT EXISTS `'
            . $database
            . '` CHARACTER SET '
            . DB_CHARSET
            . ' COLLATE utf8mb4_unicode_ci';
        if (!mysqli_query(self::server(), $sql)) {
            Response::error('Database creation error');
        }
    }
    public static function exists(string $database): bool
    {
        self::validateIdentifier($database, 'database');
        $result = mysqli_query(
            self::server(),
            'SHOW DATABASES LIKE \'' . mysqli_real_escape_string(self::server(), $database) . '\''
        );
        if (!$result) {
            return false;
        }
        $exists = mysqli_num_rows($result) > 0;
        mysqli_free_result($result);
        return $exists;
    }
    public static function isEmpty(string $database): bool
    {
        self::validateIdentifier($database, 'database');
        if (!self::exists($database)) {
            return true;
        }
        $result = mysqli_query(
            self::server(),
            'SELECT COUNT(*) AS total
            FROM information_schema.tables
            WHERE table_schema = \''
            . mysqli_real_escape_string(self::server(), $database)
            . '\''
        );
        if (!$result) {
            Response::error('Database inspection error');
        }
        $row = mysqli_fetch_assoc($result);
        mysqli_free_result($result);
        return ((int) ($row['total'] ?? 0)) === 0;
    }
    public static function close(?string $database = null): void
    {
        if ($database === null) {
            foreach (self::$connections as $connection) {
                mysqli_close($connection);
            }
            self::$connections = [];
            if (self::$server instanceof \mysqli) {
                mysqli_close(self::$server);
                self::$server = null;
            }
            return;
        }
        if (!isset(self::$connections[$database])) {
            return;
        }
        mysqli_close(self::$connections[$database]);
        unset(self::$connections[$database]);
    }
    private static function validateIdentifier(string $name, string $type): void
    {
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $name)) {
            Response::badRequest("Invalid {$type} name");
        }
    }
}
