<?php
namespace Dyscover;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
class Explore
{
    public function index(): void
    {
        Request::get();
        if (Routing::segment(3) === 'all') {
            $term = trim((string) Routing::segment(2));
            if ($term === '') {
                Response::badRequest('Missing search term');
            }
            Response::success(ExploreSearch::all($term));
            return;
        }
        $term = Routing::slug(2);
        if ($term === null) {
            Response::badRequest('Missing search term');
        }
        Response::success(ExploreSearch::all($term));
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
        $term = trim((string) Routing::segment(3));
        if ($term === '') {
            Response::badRequest('Missing search term');
        }
        return $term;
    }
}
class ExploreSearch
{
    public static function all(string $term): array
    {
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
