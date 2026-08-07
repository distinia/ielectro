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
        if (Routing::segment(2) === 'read-all') {
            Routing::method([
                'PATCH' => fn() => $this->markAllRead(),
            ]);
            return;
        }
        $id = Routing::id();
        if ($id !== null && Routing::segment(3) === 'read') {
            Routing::method([
                'PATCH' => fn() => $this->markRead($id),
            ]);
            return;
        }
        if ($id !== null) {
            Routing::method([
                'DELETE' => fn() => $this->destroy($id),
            ]);
            return;
        }
        Routing::method([
            'GET' => fn() => $this->list(),
        ]);
    }
    private function list(): void
    {
        Request::get();
        $limit = max(1, min(100, (int) Request::value('limit', 50)));
        $GLOBALS['dyscover']->database->use();
        $rows = Query::fetchAll(
            "SELECT
                n.id,
                n.actor_id,
                n.post_id,
                n.type,
                n.message,
                n.viewed_at,
                n.created_at,
                du.account_id,
                p.title AS post_title,
                p.type AS post_type,
                p.preview_image AS post_preview,
                p.uuid AS post_uuid,
                p.user_id AS post_user_id
            FROM activity n
            INNER JOIN users du ON du.id = n.actor_id
            LEFT JOIN posts p ON p.id = n.post_id
            WHERE n.recipient_id = ?
            ORDER BY n.id DESC
            LIMIT {$limit}",
            [User::id()]
        );
        $rows = Accounts::attachUsernames($rows);
        Response::success(array_map(fn(array $row): array => [
            'id' => (int) $row['id'],
            'actor_id' => (int) $row['actor_id'],
            'actor_username' => $row['username'] ?? '',
            'actor_avatar' => Avatar::url((int) $row['actor_id']),
            'post_id' => $row['post_id'] ? (int) $row['post_id'] : null,
            'post' => $row['post_id'] ? [
                'id' => (int) $row['post_id'],
                'title' => $row['post_title'] ?? '',
                'type' => $row['post_type'] ?? '',
                'preview_image' => (string) ($row['post_preview'] ?? ''),
                'uuid' => (string) ($row['post_uuid'] ?? ''),
                'user_id' => (int) ($row['post_user_id'] ?? 0),
            ] : null,
            'type' => $row['type'],
            'message' => $row['message'] ?? '',
            'read' => ($row['viewed_at'] ?? null) !== null,
            'created_at' => $row['created_at'],
        ], $rows));
    }
    private function markRead(int $id): void
    {
        Request::patch();
        $GLOBALS['dyscover']->database->use();
        Query::execute(
            'UPDATE activity
            SET viewed_at = NOW()
            WHERE id = ? AND recipient_id = ? AND viewed_at IS NULL',
            [$id, User::id()]
        );
        Response::success('Marked read');
    }
    private function markAllRead(): void
    {
        Request::patch();
        $GLOBALS['dyscover']->database->use();
        Query::execute(
            'UPDATE activity
            SET viewed_at = NOW()
            WHERE recipient_id = ? AND viewed_at IS NULL',
            [User::id()]
        );
        Response::success('All marked read');
    }
    private function destroy(int $id): void
    {
        Request::delete();
        $GLOBALS['dyscover']->database->use();
        Query::execute(
            'DELETE FROM activity
            WHERE id = ? AND recipient_id = ?',
            [$id, User::id()]
        );
        Response::success('Activity deleted');
    }
}
class ActivityNotify
{
    private const TYPES = [
        'like', 'comment', 'follow', 'share', 'message', 'mention',
    ];
    public static function push(
        int $recipientId,
        int $actorId,
        string $type,
        ?int $postId = null,
        ?string $message = null
    ): void {
        if (
            $recipientId <= 0
            || $actorId <= 0
            || $recipientId === $actorId
            || !in_array($type, self::TYPES, true)
        ) {
            return;
        }
        $GLOBALS['dyscover']->database->use();
        Query::execute(
            'INSERT INTO activity(recipient_id, actor_id, post_id, type, message)
            VALUES (?, ?, ?, ?, ?)',
            [$recipientId, $actorId, $postId, $type, $message]
        );
    }
    public static function postOwner(int $postId): ?int
    {
        $GLOBALS['dyscover']->database->use();
        $row = Query::fetch(
            "SELECT user_id FROM posts WHERE id = ? AND status = 'active' LIMIT 1",
            [$postId]
        );
        return $row ? (int) $row['user_id'] : null;
    }
    public static function postTitle(int $postId): string
    {
        $GLOBALS['dyscover']->database->use();
        $row = Query::fetch(
            'SELECT title FROM posts WHERE id = ? LIMIT 1',
            [$postId]
        );
        return trim((string) ($row['title'] ?? ''));
    }
    public static function onLike(int $postId, int $actorId): void
    {
        $ownerId = self::postOwner($postId);
        if ($ownerId === null) {
            return;
        }
        self::push(
            $ownerId,
            $actorId,
            'like',
            $postId,
            self::postTitle($postId)
        );
    }
    public static function onComment(int $postId, int $actorId): void
    {
        $ownerId = self::postOwner($postId);
        if ($ownerId === null) {
            return;
        }
        self::push(
            $ownerId,
            $actorId,
            'comment',
            $postId,
            self::postTitle($postId)
        );
    }
    public static function onShare(int $postId, int $actorId): void
    {
        $ownerId = self::postOwner($postId);
        if ($ownerId === null) {
            return;
        }
        self::push(
            $ownerId,
            $actorId,
            'share',
            $postId,
            self::postTitle($postId)
        );
    }
    public static function onFollow(int $followedId, int $followerId): void
    {
        self::push($followedId, $followerId, 'follow', null, null);
    }
}
