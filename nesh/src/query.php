<?php
namespace Nesh;
class Query
{
    public static function execute(
        string $sql,
        array $params = [],
        ?string $database = null
    ): \mysqli_result|int {
        $stmt = mysqli_prepare(Connection::start($database), $sql);
        if (!$stmt) {
            Response::error('Database query error');
        }
        if (!empty($params)) {
            $types = '';
            foreach ($params as $param) {
                if (is_int($param)) {
                    $types .= 'i';
                } elseif (is_float($param)) {
                    $types .= 'd';
                } else {
                    $types .= 's';
                }
            }
            mysqli_stmt_bind_param($stmt, $types, ...$params);
        }
        if (!mysqli_stmt_execute($stmt)) {
            mysqli_stmt_close($stmt);
            Response::error('Database execution error');
        }
        $command = strtoupper(strtok(ltrim($sql), " \t\n\r"));
        if (in_array($command, ['SELECT', 'SHOW', 'DESCRIBE', 'EXPLAIN'], true)) {
            $result = mysqli_stmt_get_result($stmt);
            mysqli_stmt_close($stmt);
            return $result;
        }
        $affected = mysqli_stmt_affected_rows($stmt);
        mysqli_stmt_close($stmt);
        return $affected;
    }
    public static function multi(string $sql, ?string $database = null): void
    {
        $conn = Connection::start($database);
        if (!mysqli_multi_query($conn, $sql)) {
            Response::error('Database execution error');
        }
        do {
            if ($result = mysqli_store_result($conn)) {
                mysqli_free_result($result);
            }
        } while (mysqli_more_results($conn) && mysqli_next_result($conn));
    }
    public static function fetchAll(
        string $sql,
        array $params = [],
        ?string $database = null
    ): array {
        $result = self::execute($sql, $params, $database);
        $rows = [];
        if ($result) {
            while ($row = mysqli_fetch_assoc($result)) {
                $rows[] = $row;
            }
        }
        return $rows;
    }
    public static function fetch(
        string $sql,
        array $params = [],
        ?string $database = null
    ): ?array {
        $result = self::execute($sql, $params, $database);
        if (!$result) {
            return null;
        }
        $row = mysqli_fetch_assoc($result);
        return $row ?: null;
    }
    public static function value(
        string $sql,
        array $params = [],
        ?string $database = null
    ): mixed {
        $row = self::fetch($sql, $params, $database);
        if (!$row) {
            return null;
        }
        return reset($row);
    }
    public static function rows(
        string $sql,
        array $params = [],
        ?string $database = null
    ): \mysqli_result|int {
        return self::execute($sql, $params, $database);
    }
    public static function count(
        string $sql,
        array $params = [],
        ?string $database = null
    ): int {
        return (int) self::value($sql, $params, $database);
    }
    public static function exists(
        string $sql,
        array $params = [],
        ?string $database = null
    ): bool {
        return self::fetch($sql, $params, $database) !== null;
    }
    public static function escape(mixed $value, ?string $database = null): string
    {
        return mysqli_real_escape_string(Connection::start($database), (string) $value);
    }
    public static function begin(?string $database = null): bool
    {
        return mysqli_begin_transaction(Connection::start($database));
    }
    public static function commit(?string $database = null): bool
    {
        return mysqli_commit(Connection::start($database));
    }
    public static function rollback(?string $database = null): bool
    {
        return mysqli_rollback(Connection::start($database));
    }
    public static function lastId(?string $database = null): int|string
    {
        return mysqli_insert_id(Connection::start($database));
    }
    public static function hasTable(string $table, ?string $database = null): bool
    {
        return self::exists(
            'SHOW TABLES LIKE ?',
            [$table],
            $database
        );
    }
}
