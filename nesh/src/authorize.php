<?php
namespace Nesh;
class Authorize
{
    public static function exists(string $table, string $column = 'id'): void 
    {
        if (!Query::exists(
            "SELECT 1
             FROM {$table}
             WHERE {$column} = ?
             LIMIT 1",
            [Request::id()]
        )) {
            Response::notFound();
        }
    }
    public static function owner(string $table, string $owner = 'user_id', string $column = 'id'): void 
    {
        $record = Query::fetch(
            "SELECT {$owner}
             FROM {$table}
             WHERE {$column} = ?
             LIMIT 1",
            [Request::id()]
        );
        if ($record === null) {
            Response::notFound();
        }
        if ((int) $record[$owner] !== Session::id()) {
            Response::forbidden();
        }
    }
}