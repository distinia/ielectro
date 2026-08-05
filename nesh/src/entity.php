<?php
namespace Nesh;
class Entity implements \ArrayAccess
{
    private array $record = [];
    public function __construct(
        string $table,
        string $column,
        mixed $value
    ) {
        self::validateIdentifier($table, 'table');
        self::validateIdentifier($column, 'column');
        $row = Query::fetch(
            "SELECT *
            FROM {$table}
            WHERE {$column} = ?
            LIMIT 1",
            [$value]
        );
        if (!$row) {
            Response::notFound();
        }
        $this->record = $row;
    }
    public function file(string $path): string
    {
        if (!is_file($path)) {
            Response::notFound();
        }
        $contents = file_get_contents($path);
        if ($contents === false) {
            Response::notFound();
        }
        return $contents;
    }
    public function offsetExists(mixed $offset): bool
    {
        return array_key_exists($offset, $this->record);
    }
    public function offsetGet(mixed $offset): mixed
    {
        if (!$this->offsetExists($offset)) {
            return null;
        }
        $value = $this->record[$offset];
        if (is_string($value)) {
            return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, CHARSET);
        }
        return $value;
    }
    public function offsetSet(mixed $offset, mixed $value): void
    {
        Response::error('Entity is read-only');
    }
    public function offsetUnset(mixed $offset): void
    {
        Response::error('Entity is read-only');
    }
    private static function validateIdentifier(string $name, string $type): void
    {
        if (!preg_match('/^[a-z][a-z0-9_]*$/', $name)) {
            Response::badRequest("Invalid {$type} name");
        }
    }
}
