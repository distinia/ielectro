<?php
namespace Nesh;
class Query
{
    public static function execute(string $sql, array $params = []): \mysqli_result|int
    {
        $stmt = mysqli_prepare(Database::start(), $sql);
        if (!$stmt) {
            Response::error('Database query error');
        }
        if ($params) {
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
    public static function multi(string $sql): void
    {
        $connection = Database::start();
        if (!mysqli_multi_query($connection, $sql)) {
            Response::error('Database execution error');
        }
        do {
            if ($result = mysqli_store_result($connection)) {
                mysqli_free_result($result);
            }
        } while (
            mysqli_more_results($connection)
            && mysqli_next_result($connection)
        );
    }
    public static function fetchAll(string $sql, array $params = []): array
    {
        $result = self::execute($sql, $params);
        if (!$result instanceof \mysqli_result) {
            return [];
        }
        return mysqli_fetch_all($result, MYSQLI_ASSOC);
    }
    public static function fetch(string $sql, array $params = []): ?array
    {
        $result = self::execute($sql, $params);
        if (!$result instanceof \mysqli_result) {
            return null;
        }
        $row = mysqli_fetch_assoc($result);
        return $row ?: null;
    }
    public static function value(string $sql, array $params = []): mixed
    {
        $row = self::fetch($sql, $params);
        return $row ? reset($row) : null;
    }
    public static function rows(string $sql, array $params = []): \mysqli_result|int
    {
        return self::execute($sql, $params);
    }
    public static function count(string $sql, array $params = []): int
    {
        return (int) self::value($sql, $params);
    }
    public static function exists(string $sql, array $params = []): bool
    {
        return self::fetch($sql, $params) !== null;
    }
    public static function escape(mixed $value): string
    {
        return mysqli_real_escape_string(
            Database::start(),
            (string) $value
        );
    }
    public static function begin(): bool
    {
        return mysqli_begin_transaction(Database::start());
    }
    public static function commit(): bool
    {
        return mysqli_commit(Database::start());
    }
    public static function rollback(): bool
    {
        return mysqli_rollback(Database::start());
    }
    public static function lastId(): int|string
    {
        return mysqli_insert_id(Database::start());
    }
    public static function hasTable(string $table): bool
    {
        return self::exists(
            'SHOW TABLES LIKE ?',
            [$table]
        );
    }
}