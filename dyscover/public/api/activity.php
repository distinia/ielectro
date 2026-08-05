<?php
namespace Dyscover;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
class Activity
{
    public function index(): void
    {
        Routing::method([
            'GET'    => fn() => $this->list(),
            'DELETE' => fn() => $this->destroy(),
        ]);
    }
    private function list(): void
    {
        Request::get();
        $limit = max(1, min(100, (int) Request::value('limit', 50)));
        $rows = Query::fetchAll(
            "SELECT
                n.id,
                n.actor_id,
                n.post_id,
                n.type,
                n.message,
                n.viewed_at,
                n.created_at,
                a.username AS actor_username
            FROM dyscover_activity n
            INNER JOIN dyscover_users du ON du.id = n.actor_id
            INNER JOIN accounts a ON a.id = du.account_id
            WHERE n.recipient_id = ?
            ORDER BY n.id DESC
            LIMIT {$limit}",
            [User::id()]
        );
        Response::success(array_map(fn(array $row): array => [
            'id' => (int) $row['id'],
            'actor_id' => (int) $row['actor_id'],
            'actor_username' => $row['actor_username'],
            'actor_avatar' => Avatar::url((int) $row['actor_id']),
            'post_id' => $row['post_id'] ? (int) $row['post_id'] : null,
            'type' => $row['type'],
            'message' => $row['message'] ?? '',
            'read' => ($row['viewed_at'] ?? null) !== null,
            'created_at' => $row['created_at'],
        ], $rows));
    }
    private function destroy(): void
    {
        Request::delete();
        $id = Routing::id();
        if ($id === null) {
            Response::badRequest('Missing activity id');
        }
        Query::execute(
            'DELETE FROM dyscover_activity
            WHERE id = ? AND recipient_id = ?',
            [$id, User::id()]
        );
        Response::success('Activity deleted');
    }
}
