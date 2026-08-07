<?php
namespace Nesh;
class Database
{
    public static ?Database $current = null;
    private ?\mysqli $server = null;
    public string $name;
    public function __construct(string $name)
    {
        $this->name = $name;
    }
    public function use(): void
    {
        if (self::$current instanceof self && self::$current !== $this) {
            self::$current->close();
        }
        self::$current = $this;
        $this->connect();
    }
    public static function start(): \mysqli
    {
        if (!(self::$current instanceof self)) {
            Response::error('No active database.');
        }
        return self::$current->connect();
    }
    public function create(): void
    {
        $server = mysqli_connect(DB_HOST, DB_USER, DB_PASS, null, DB_PORT);
        if (!$server) {
            Response::error('Server connection error');
        }
        mysqli_set_charset($server, DB_CHARSET);
        $sql = sprintf(
            "CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET %s COLLATE utf8mb4_unicode_ci",
            $this->name,
            DB_CHARSET
        );
        if (!mysqli_query($server, $sql)) {
            Response::error('Database creation error');
        }
        mysqli_close($server);
    }
    private function connect(): \mysqli
    {
        if ($this->server instanceof \mysqli) {
            return $this->server;
        }
        $this->server = mysqli_connect(
            DB_HOST,
            DB_USER,
            DB_PASS,
            $this->name,
            DB_PORT
        );
        if (!$this->server) {
            Response::error('Database connection error');
        }
        if (!mysqli_set_charset($this->server, DB_CHARSET)) {
            Response::error('Database charset error');
        }
        return $this->server;
    }
    public function close(): void
    {
        if ($this->server instanceof \mysqli) {
            mysqli_close($this->server);
            $this->server = null;
        }
    }
    public function tables(string $path): void
    {
        $this->connect();
        $result = mysqli_query($this->server, 'SHOW TABLES');
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
            if (!mysqli_multi_query($this->server, $sql)) {
                Response::error('SQL error in "' . basename($file) . '"');
            }
            do {
                if ($result = mysqli_store_result($this->server)) {
                    mysqli_free_result($result);
                }
            } while (
                mysqli_more_results($this->server)
                && mysqli_next_result($this->server)
            );
        }
    }
}