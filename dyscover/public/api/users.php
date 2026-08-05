<?php
namespace Dyscover;
use Nesh\Identity;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
class Users
{
    public function index(): void
    {
        $resource = Routing::segment(3);
        if ($resource === 'followers') {
            (new UserFollowers())->index();
            return;
        }
        if ($resource === 'following') {
            (new UserFollowing())->index();
            return;
        }
        if ($resource === 'posts') {
            (new UserPosts())->index();
            return;
        }
        if ($resource === 'likes') {
            (new UserEngagement('dyscover_post_likes'))->index();
            return;
        }
        if ($resource === 'bookmarks') {
            (new UserEngagement('dyscover_post_bookmarks'))->index();
            return;
        }
        if ($resource === 'reposts') {
            (new UserEngagement('dyscover_post_reposts'))->index();
            return;
        }
        Routing::method([
            'GET'   => fn() => $this->show(),
            'PATCH' => fn() => $this->update(),
        ]);
    }
    private function show(): void
    {
        Request::get();
        $id = Routing::id();
        if ($id === null) {
            Response::badRequest('Missing user id');
        }
        Response::success(UserProfile::one($id));
    }
    private function update(): void
    {
        Request::patch();
        $id = Routing::id();
        if ($id === null || $id !== User::id()) {
            Response::forbidden();
        }
        $input = Request::body();
        $fields = [];
        $params = [];
        foreach (['biography', 'website'] as $field) {
            if (!array_key_exists($field, $input)) {
                continue;
            }
            $fields[] = "{$field} = ?";
            $params[] = trim((string) $input[$field]);
        }
        if (!$fields) {
            Response::badRequest('Nothing to update');
        }
        $params[] = $id;
        Query::execute(
            'UPDATE dyscover_users SET ' . implode(', ', $fields) . ' WHERE id = ?',
            $params
        );
        Response::success(UserProfile::one($id));
    }
}
class User
{
    public static function id(): int
    {
        $accountId = Identity::id();
        $row = Query::fetch(
            'SELECT id FROM dyscover_users WHERE account_id = ? LIMIT 1',
            [$accountId]
        );
        if (!$row) {
            Query::execute(
                'INSERT INTO dyscover_users(account_id) VALUES(?)',
                [$accountId]
            );
            return Query::lastId();
        }
        return (int) $row['id'];
    }
}
class UserProfile
{
    public static function one(int $id): array
    {
        $row = Query::fetch(
            "SELECT
                du.id,
                du.biography,
                du.website,
                du.role,
                du.status,
                du.created_at,
                a.username
            FROM dyscover_users du
            INNER JOIN accounts a ON a.id = du.account_id
            WHERE du.id = ?
            LIMIT 1",
            [$id]
        );
        if (!$row) {
            Response::notFound('User not found');
        }
        return [
            'id' => (int) $row['id'],
            'username' => $row['username'],
            'biography' => $row['biography'] ?? '',
            'website' => $row['website'] ?? '',
            'role' => $row['role'],
            'status' => $row['status'],
            'avatar' => Avatar::url((int) $row['id']),
            'followers' => Query::count(
                'SELECT COUNT(*) FROM dyscover_follows WHERE followed_id = ?',
                [$id]
            ),
            'following' => Query::count(
                'SELECT COUNT(*) FROM dyscover_follows WHERE follower_id = ?',
                [$id]
            ),
            'created_at' => $row['created_at'],
        ];
    }
}
class UserCard
{
    public static function one(int $id): array
    {
        $row = Query::fetch(
            "SELECT du.id, du.biography, a.username
            FROM dyscover_users du
            INNER JOIN accounts a ON a.id = du.account_id
            WHERE du.id = ?
            LIMIT 1",
            [$id]
        );
        if (!$row) {
            Response::notFound('User not found');
        }
        return [
            'id' => (int) $row['id'],
            'username' => $row['username'],
            'biography' => $row['biography'] ?? '',
            'avatar' => Avatar::url((int) $row['id']),
        ];
    }
}
class UserFollowers
{
    public function index(): void
    {
        Routing::method([
            'GET'    => fn() => $this->list(),
            'POST'   => fn() => $this->add(),
            'DELETE' => fn() => $this->remove(),
        ]);
    }
    private function list(): void
    {
        Request::get();
        $id = Routing::id();
        if ($id === null) {
            Response::badRequest('Missing user id');
        }
        $rows = Query::fetchAll(
            "SELECT du.id
            FROM dyscover_follows f
            INNER JOIN dyscover_users du ON du.id = f.follower_id
            WHERE f.followed_id = ?
            ORDER BY f.created_at DESC",
            [$id]
        );
        Response::success(array_map(
            fn(array $row): array => UserCard::one((int) $row['id']),
            $rows
        ));
    }
    private function add(): void
    {
        Request::post();
        $followedId = Routing::id();
        if ($followedId === null) {
            Response::badRequest('Missing user id');
        }
        $followerId = User::id();
        if ($followerId === $followedId) {
            Response::badRequest('Invalid follow target');
        }
        Query::execute(
            'INSERT IGNORE INTO dyscover_follows(follower_id, followed_id) VALUES(?, ?)',
            [$followerId, $followedId]
        );
        Response::created('Followed');
    }
    private function remove(): void
    {
        Request::delete();
        $followedId = Routing::id();
        if ($followedId === null) {
            Response::badRequest('Missing user id');
        }
        Query::execute(
            'DELETE FROM dyscover_follows
            WHERE follower_id = ? AND followed_id = ?',
            [User::id(), $followedId]
        );
        Response::success('Unfollowed');
    }
}
class UserFollowing
{
    public function index(): void
    {
        Request::get();
        $id = Routing::id();
        if ($id === null) {
            Response::badRequest('Missing user id');
        }
        $rows = Query::fetchAll(
            "SELECT du.id
            FROM dyscover_follows f
            INNER JOIN dyscover_users du ON du.id = f.followed_id
            WHERE f.follower_id = ?
            ORDER BY f.created_at DESC",
            [$id]
        );
        Response::success(array_map(
            fn(array $row): array => UserCard::one((int) $row['id']),
            $rows
        ));
    }
}
class UserPosts
{
    public function index(): void
    {
        Request::get();
        $id = Routing::id();
        if ($id === null) {
            Response::badRequest('Missing user id');
        }
        Response::success(PostData::listByUser($id));
    }
}
class UserEngagement
{
    public function __construct(private string $table)
    {
    }
    public function index(): void
    {
        Request::get();
        $id = Routing::id();
        if ($id === null) {
            Response::badRequest('Missing user id');
        }
        Response::success(PostData::listByEngagement($this->table, $id));
    }
}
