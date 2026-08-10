<?php
namespace Dyscover;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
use Nesh\Validate;
class Explore
{
    public function index(): void
    {
        Request::get();
        if (Routing::segment(3) === 'all') {
            Response::success(ExploreSearch::all(self::searchTerm(2)));
            return;
        }
        Response::success(ExploreSearch::all(self::searchTerm(2)));
    }
    public function recents(): void
    {
        Request::get();
        Response::success(ExploreSearch::recents());
    }
    public function articles(): void
    {
        Request::get();
        Response::success(ExploreSearch::posts('article', $this->term()));
    }
    public function images(): void
    {
        Request::get();
        Response::success(ExploreSearch::posts('image', $this->term()));
    }
    public function videos(): void
    {
        Request::get();
        Response::success(ExploreSearch::posts('video', $this->term()));
    }
    public function audio(): void
    {
        Request::get();
        Response::success(ExploreSearch::posts('audio', $this->term()));
    }
    public function documents(): void
    {
        Request::get();
        Response::success(ExploreSearch::posts('document', $this->term()));
    }
    public function templates(): void
    {
        Request::get();
        Response::success(ExploreSearch::posts('template', $this->term()));
    }
    public function users(): void
    {
        Request::get();
        Response::success(ExploreSearch::users($this->term()));
    }
    private function term(): string
    {
        return self::searchTerm(3);
    }
    private static function searchTerm(int $index): string
    {
        $raw = trim((string) Routing::segment($index));
        if ($raw === '') {
            Response::badRequest('Missing search term');
        }
        if (Validate::uuid(strtolower($raw))) {
            return strtolower($raw);
        }
        $slug = Routing::slug($index);
        if ($slug !== null) {
            return $slug;
        }
        return $raw;
    }
}
class ExploreSearch
{
    public static function all(string $term): array
    {
        if (Validate::uuid(strtolower($term))) {
            return self::allByUuid(strtolower($term));
        }
        return [
            'articles' => self::posts('article', $term),
            'images' => self::posts('image', $term),
            'videos' => self::posts('video', $term),
            'audios' => self::posts('audio', $term),
            'documents' => self::posts('document', $term),
            'templates' => self::posts('template', $term),
            'users' => self::users($term),
        ];
    }
    public static function allByUuid(string $uuid): array
    {
        $result = [
            'articles' => [],
            'images' => [],
            'videos' => [],
            'audios' => [],
            'documents' => [],
            'templates' => [],
            'users' => [],
        ];
        $row = self::fetchPostByUuid($uuid);
        if (!$row) {
            return $result;
        }
        $mapped = PostData::mapRows([$row]);
        $post = $mapped[0] ?? null;
        if (!$post) {
            return $result;
        }
        $bucket = match ((string) ($row['type'] ?? '')) {
            'article' => 'articles',
            'image' => 'images',
            'video' => 'videos',
            'audio' => 'audios',
            'document' => 'documents',
            'template' => 'templates',
            default => null,
        };
        if ($bucket !== null) {
            $result[$bucket] = [$post];
        }
        return $result;
    }
    public static function recents(): array
    {
        $rows = Query::fetchAll(
            "SELECT
                p.*,
                du.account_id,
                s.views,
                s.likes,
                s.comments,
                s.shares,
                s.bookmarks
            FROM ielectro_dyscover.dyscover_posts p
            INNER JOIN ielectro_dyscover.dyscover_users du ON du.id = p.user_id
            LEFT JOIN ielectro_dyscover.dyscover_post_statistics s ON s.post_id = p.id
            WHERE p.status = 'active'
            AND p.visibility = 'public'
            ORDER BY s.views DESC, p.published_at DESC
            LIMIT 30"
        );
        return PostData::mapRows($rows);
    }
    public static function posts(string $type, string $term): array
    {
        if (Validate::uuid(strtolower($term))) {
            $row = self::fetchPostByUuid(strtolower($term), $type);
            return $row ? PostData::mapRows([$row]) : [];
        }
        $like = '%' . $term . '%';
        $normalizedTag = mb_strtolower(ltrim(trim($term), '#'));
        $tagSql = '';
        $params = [$type, $like, $like];
        if ($normalizedTag !== '') {
            $tagSql = ' OR EXISTS (
                SELECT 1
                FROM ielectro_dyscover.dyscover_post_tags pt
                INNER JOIN ielectro_dyscover.dyscover_tags t ON t.id = pt.tag_id
                WHERE pt.post_id = p.id
                AND t.name LIKE ?
            )';
            $params[] = '%' . $normalizedTag . '%';
        }
        $rows = Query::fetchAll(
            "SELECT
                p.*,
                du.account_id,
                s.views,
                s.likes,
                s.comments,
                s.shares,
                s.bookmarks
            FROM ielectro_dyscover.dyscover_posts p
            INNER JOIN ielectro_dyscover.dyscover_users du ON du.id = p.user_id
            LEFT JOIN ielectro_dyscover.dyscover_post_statistics s ON s.post_id = p.id
            WHERE p.type = ?
            AND p.status = 'active'
            AND p.visibility = 'public'
            AND (p.title LIKE ? OR p.description LIKE ?{$tagSql})
            ORDER BY p.published_at DESC
            LIMIT 30",
            $params
        );
        return PostData::mapRows($rows);
    }
    private static function fetchPostByUuid(string $uuid, ?string $type = null): ?array
    {
        $params = [strtolower($uuid)];
        $typeSql = '';
        if ($type !== null) {
            $typeSql = ' AND p.type = ?';
            $params[] = $type;
        }
        $row = Query::fetch(
            "SELECT
                p.*,
                du.account_id,
                s.views,
                s.likes,
                s.comments,
                s.shares,
                s.bookmarks
            FROM ielectro_dyscover.dyscover_posts p
            INNER JOIN ielectro_dyscover.dyscover_users du ON du.id = p.user_id
            LEFT JOIN ielectro_dyscover.dyscover_post_statistics s ON s.post_id = p.id
            WHERE p.uuid = ?
            AND p.status = 'active'
            AND p.visibility = 'public'{$typeSql}
            LIMIT 1",
            $params
        );
        return is_array($row) ? $row : null;
    }
    public static function users(string $term): array
    {
        $accounts = Query::fetchAll(
            'SELECT id FROM ielectro_account.accounts WHERE username LIKE ? ORDER BY username ASC LIMIT 20',
            ['%' . $term . '%']
        );
        if (!$accounts) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($accounts), '?'));
        $accountIds = array_map(
            static fn(array $row): int => (int) $row['id'],
            $accounts
        );
        $rows = Query::fetchAll(
            "SELECT id FROM ielectro_dyscover.dyscover_users WHERE account_id IN ({$placeholders})",
            $accountIds
        );
        return array_map(
            fn(array $row): array => UserCard::one((int) $row['id']),
            $rows
        );
    }
}
