<?php
namespace Dyscover;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
class Activity
{
    private const GROUPABLE_TYPES = ['like', 'comment', 'mention'];
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
        $fetchLimit = min(500, max($limit * 8, 100));
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
            FROM ielectro_dyscover.dyscover_activity n
            INNER JOIN ielectro_dyscover.dyscover_users du ON du.id = n.actor_id
            LEFT JOIN ielectro_dyscover.dyscover_posts p ON p.id = n.post_id
            WHERE n.recipient_id = ?
            AND n.type <> 'share'
            ORDER BY n.id DESC
            LIMIT {$fetchLimit}",
            [User::id()]
        );
        $rows = Accounts::attachUsernames($rows);
        $viewerId = User::id();
        $groups = [];
        $order = [];
        foreach ($rows as $row) {
            $key = self::groupKey($row);
            if (!isset($groups[$key])) {
                $groups[$key] = [];
                $order[] = $key;
            }
            $groups[$key][] = $row;
        }
        $items = [];
        foreach ($order as $key) {
            $items[] = self::mapGroup($groups[$key], $viewerId);
            if (count($items) >= $limit) {
                break;
            }
        }
        Response::success($items);
    }
    private static function groupKey(array $row): string
    {
        $type = (string) ($row['type'] ?? '');
        $postId = (int) ($row['post_id'] ?? 0);
        if (in_array($type, self::GROUPABLE_TYPES, true) && $postId > 0) {
            return $type . ':' . $postId;
        }
        return 'single:' . (int) ($row['id'] ?? 0);
    }
    private static function mapGroup(array $rows, int $viewerId): array
    {
        usort(
            $rows,
            static fn(array $a, array $b): int => (int) ($b['id'] ?? 0) <=> (int) ($a['id'] ?? 0)
        );
        $latest = $rows[0];
        $actors = [];
        $seenActors = [];
        foreach ($rows as $row) {
            $actorId = (int) ($row['actor_id'] ?? 0);
            if ($actorId <= 0 || isset($seenActors[$actorId])) {
                continue;
            }
            $seenActors[$actorId] = true;
            $actors[] = [
                'id' => $actorId,
                'username' => (string) ($row['username'] ?? ''),
                'avatar' => Avatar::url($actorId),
            ];
        }
        $topActors = array_slice($actors, 0, 2);
        $othersCount = max(0, count($actors) - count($topActors));
        $ids = array_values(array_map(
            static fn(array $row): int => (int) ($row['id'] ?? 0),
            $rows
        ));
        $allRead = !array_filter(
            $rows,
            static fn(array $row): bool => ($row['viewed_at'] ?? null) === null
        );
        $payload = [
            'id' => (int) ($latest['id'] ?? 0),
            'ids' => $ids,
            'actor_id' => (int) ($latest['actor_id'] ?? 0),
            'actor_username' => (string) ($latest['username'] ?? ''),
            'actor_avatar' => Avatar::url((int) ($latest['actor_id'] ?? 0)),
            'actors' => $topActors,
            'others_count' => $othersCount,
            'actor_count' => count($actors),
            'post_id' => !empty($latest['post_id']) ? (int) $latest['post_id'] : null,
            'post' => !empty($latest['post_id']) ? [
                'id' => (int) $latest['post_id'],
                'title' => $latest['post_title'] ?? '',
                'type' => $latest['post_type'] ?? '',
                'preview_image' => (string) ($latest['post_preview'] ?? ''),
                'uuid' => (string) ($latest['post_uuid'] ?? ''),
                'user_id' => (int) ($latest['post_user_id'] ?? 0),
            ] : null,
            'type' => (string) ($latest['type'] ?? ''),
            'message' => $latest['message'] ?? '',
            'read' => $allRead,
            'created_at' => $latest['created_at'] ?? null,
        ];
        if (($latest['type'] ?? '') === 'follow') {
            $payload['viewer_following'] = Query::exists(
                'SELECT 1 FROM ielectro_dyscover.dyscover_follows
                WHERE follower_id = ? AND followed_id = ?
                LIMIT 1',
                [$viewerId, (int) ($latest['actor_id'] ?? 0)]
            );
        }
        return $payload;
    }
    private function rowFor(int $id): ?array
    {
        return Query::fetch(
            'SELECT id, recipient_id, type, post_id
            FROM ielectro_dyscover.dyscover_activity
            WHERE id = ? AND recipient_id = ?
            LIMIT 1',
            [$id, User::id()]
        );
    }
    private function markRead(int $id): void
    {
        Request::patch();
        $row = $this->rowFor($id);
        if (!$row) {
            Response::success('Marked read');
            return;
        }
        if ($this->isGroupableRow($row)) {
            Query::execute(
                'UPDATE ielectro_dyscover.dyscover_activity
                SET viewed_at = NOW()
                WHERE recipient_id = ?
                AND type = ?
                AND post_id = ?
                AND viewed_at IS NULL',
                [User::id(), (string) $row['type'], (int) $row['post_id']]
            );
            Response::success('Marked read');
            return;
        }
        Query::execute(
            'UPDATE ielectro_dyscover.dyscover_activity
            SET viewed_at = NOW()
            WHERE id = ? AND recipient_id = ? AND viewed_at IS NULL',
            [$id, User::id()]
        );
        Response::success('Marked read');
    }
    private function markAllRead(): void
    {
        Request::patch();
        Query::execute(
            'UPDATE ielectro_dyscover.dyscover_activity
            SET viewed_at = NOW()
            WHERE recipient_id = ? AND viewed_at IS NULL',
            [User::id()]
        );
        Response::success('All marked read');
    }
    private function destroy(int $id): void
    {
        Request::delete();
        $row = $this->rowFor($id);
        if (!$row) {
            Response::success('Activity deleted');
            return;
        }
        if ($this->isGroupableRow($row)) {
            Query::execute(
                'DELETE FROM ielectro_dyscover.dyscover_activity
                WHERE recipient_id = ?
                AND type = ?
                AND post_id = ?',
                [User::id(), (string) $row['type'], (int) $row['post_id']]
            );
            Response::success('Activity deleted');
            return;
        }
        Query::execute(
            'DELETE FROM ielectro_dyscover.dyscover_activity
            WHERE id = ? AND recipient_id = ?',
            [$id, User::id()]
        );
        Response::success('Activity deleted');
    }
    private function isGroupableRow(array $row): bool
    {
        $type = (string) ($row['type'] ?? '');
        $postId = (int) ($row['post_id'] ?? 0);
        return in_array($type, self::GROUPABLE_TYPES, true) && $postId > 0;
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
            || $type === 'share'
        ) {
            return;
        }
        Query::execute(
            'INSERT INTO ielectro_dyscover.dyscover_activity(recipient_id, actor_id, post_id, type, message)
            VALUES (?, ?, ?, ?, ?)',
            [$recipientId, $actorId, $postId, $type, $message]
        );
    }
    public static function postOwner(int $postId): ?int
    {
        $row = Query::fetch(
            "SELECT user_id FROM ielectro_dyscover.dyscover_posts WHERE id = ? AND status = 'active' LIMIT 1",
            [$postId]
        );
        return $row ? (int) $row['user_id'] : null;
    }
    public static function postTitle(int $postId): string
    {
        $row = Query::fetch(
            'SELECT title FROM ielectro_dyscover.dyscover_posts WHERE id = ? LIMIT 1',
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
        return;
    }
    public static function onFollow(int $followedId, int $followerId): void
    {
        self::push($followedId, $followerId, 'follow', null, null);
    }
    public static function onMention(int $postId, int $actorId, int $mentionedUserId): void
    {
        self::push(
            $mentionedUserId,
            $actorId,
            'mention',
            $postId,
            self::postTitle($postId)
        );
    }
}
