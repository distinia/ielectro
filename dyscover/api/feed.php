<?php
namespace Dyscover;
use Nesh\File;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
class Feed
{
    public function index(): void
    {
        Routing::method([
            'GET' => fn() => $this->list(),
            'PUT' => fn() => $this->updateInterests(),
        ]);
    }
    private function list(): void
    {
        Request::get();
        $userId = User::id();
        $interests = self::readInterests($userId);
        $segmentLimit = Routing::segment(2);
        $limit = 50;
        if (is_string($segmentLimit) && ctype_digit($segmentLimit)) {
            $limit = (int) $segmentLimit;
        }
        $limit = max(1, min(100, $limit));
        $types = $interests['types'] ?? ['article'];
        $tags = $interests['tags'] ?? [];
        $placeholders = implode(',', array_fill(0, count($types), '?'));
        $params = $types;
        $tagSql = '';
        if ($tags) {
            $tagPlaceholders = implode(',', array_fill(0, count($tags), '?'));
            $tagSql = " AND p.id IN (
                SELECT pt.post_id
                FROM post_tags pt
                INNER JOIN tags t ON t.id = pt.tag_id
                WHERE t.name IN ({$tagPlaceholders})
            )";
            $params = array_merge($params, $tags);
        }
        $params[] = $userId;
        $params[] = $userId;
        $rows = Query::fetchAll(
            "SELECT
                p.*,
                a.username,
                s.views,
                s.likes,
                s.comments,
                s.shares,
                s.bookmarks
            FROM posts p
            INNER JOIN users du ON du.id = p.user_id
            " . Db::joinAccounts() . "
            LEFT JOIN post_statistics s ON s.post_id = p.id
            WHERE p.type IN ({$placeholders})
            AND p.status = 'active'
            AND p.visibility = 'public'
            {$tagSql}
            AND p.user_id IN (
                SELECT followed_id FROM follows WHERE follower_id = ?
                UNION SELECT ?
            )
            ORDER BY p.published_at DESC, p.id DESC
            LIMIT {$limit}",
            $params
        );
        Response::success(PostData::mapRows($rows));
    }
    private function updateInterests(): void
    {
        Request::put();
        $userId = User::id();
        $path = self::interestsPath($userId);
        $metaPath = self::metaPath($userId);
        if (is_file($metaPath)) {
            $meta = json_decode((string) file_get_contents($metaPath), true);
            $updatedAt = (int) ($meta['updated_at'] ?? 0);
            if ($updatedAt > time() - 86400) {
                Response::badRequest('Interests can be updated once per day');
            }
        }
        $input = Request::body();
        $interests = [
            'types' => array_values(array_filter(
                (array) ($input['types'] ?? []),
                fn($type): bool => in_array($type, [
                    'article', 'image', 'video', 'audio', 'document', 'template',
                ], true)
            )),
            'tags' => array_values(array_filter(
                array_map('trim', (array) ($input['tags'] ?? [])),
                fn(string $tag): bool => $tag !== ''
            )),
        ];
        if (!$interests['types']) {
            $interests['types'] = ['article'];
        }
        File::makeDirectory(dirname($path));
        file_put_contents($path, json_encode($interests, JSON_UNESCAPED_UNICODE));
        file_put_contents($metaPath, json_encode(['updated_at' => time()]));
        Response::success($interests);
    }
    private static function readInterests(int $userId): array
    {
        $path = self::interestsPath($userId);
        if (!is_file($path)) {
            return ['types' => ['article'], 'tags' => []];
        }
        $data = json_decode((string) file_get_contents($path), true);
        return is_array($data) ? $data : ['types' => ['article'], 'tags' => []];
    }
    private static function interestsPath(int $userId): string
    {
        return APP_ASSETS . '/users/' . $userId . '/settings/interests.json';
    }
    private static function metaPath(int $userId): string
    {
        return APP_ASSETS . '/users/' . $userId . '/settings/interests.meta.json';
    }
}
