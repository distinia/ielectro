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
                a.username,
                s.views,
                s.likes,
                s.comments,
                s.shares,
                s.bookmarks
            FROM dyscover_posts p
            INNER JOIN dyscover_users du ON du.id = p.user_id
            INNER JOIN accounts a ON a.id = du.account_id
            LEFT JOIN dyscover_post_statistics s ON s.post_id = p.id
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
        $rows = Query::fetchAll(
            "SELECT
                p.*,
                a.username,
                s.views,
                s.likes,
                s.comments,
                s.shares,
                s.bookmarks
            FROM dyscover_posts p
            INNER JOIN dyscover_users du ON du.id = p.user_id
            INNER JOIN accounts a ON a.id = du.account_id
            LEFT JOIN dyscover_post_statistics s ON s.post_id = p.id
            WHERE p.type = ?
            AND p.status = 'active'
            AND p.visibility = 'public'
            AND (p.title LIKE ? OR p.description LIKE ?)
            ORDER BY p.published_at DESC
            LIMIT 30",
            [$type, $like, $like]
        );
        return PostData::mapRows($rows);
    }
    public static function users(string $term): array
    {
        $rows = Query::fetchAll(
            "SELECT du.id
            FROM dyscover_users du
            INNER JOIN accounts a ON a.id = du.account_id
            WHERE a.username LIKE ?
            ORDER BY a.username ASC
            LIMIT 20",
            ['%' . $term . '%']
        );
        return array_map(
            fn(array $row): array => UserCard::one((int) $row['id']),
            $rows
        );
    }
}
