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
            (new UserEngagement('ielectro_dyscover.dyscover_post_likes'))->index();
            return;
        }
        if ($resource === 'bookmarks') {
            (new UserEngagement('ielectro_dyscover.dyscover_post_bookmarks'))->index();
            return;
        }
        if ($resource === 'reposts') {
            (new UserEngagement('ielectro_dyscover.dyscover_post_reposts'))->index();
            return;
        }
        if ($resource === 'mentions') {
            (new UserEngagement('ielectro_dyscover.dyscover_post_mentions'))->index();
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
        $key = Routing::segment(2);
        if ($key === null || $key === '') {
            Response::badRequest('Missing user id');
        }
        if (ctype_digit((string) $key)) {
            Response::success(UserProfile::one((int) $key));
        }
        Response::success(UserProfile::byUsername((string) $key));
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
            'UPDATE ielectro_dyscover.dyscover_users SET ' . implode(', ', $fields) . ' WHERE id = ?',
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
        if ($accountId === null) {
            Response::unauthorized();
        }
        $row = Query::fetch(
            'SELECT id, status, suspended_until
            FROM ielectro_dyscover.dyscover_users
            WHERE account_id = ?
            LIMIT 1',
            [$accountId]
        );
        if (!$row) {
            Query::execute(
                'INSERT INTO ielectro_dyscover.dyscover_users(account_id) VALUES(?)',
                [$accountId]
            );
            $userId = (int) Query::lastId();
            Avatar::provision($userId);
            return $userId;
        }
        self::refreshSuspension($row);
        self::assertCanAccess($row);
        return (int) $row['id'];
    }

    public static function requireCanPost(): void
    {
        $row = self::statusRow();
        if (!$row) {
            Response::unauthorized();
        }
        self::refreshSuspension($row);
        if ((string) $row['status'] === 'suspended') {
            Response::forbidden('Your Dyscover account is suspended');
        }
    }

    public static function statusRow(): ?array
    {
        $accountId = Identity::id();
        if ($accountId === null) {
            return null;
        }
        return Query::fetch(
            'SELECT id, status, suspended_until, ban_reason
            FROM ielectro_dyscover.dyscover_users
            WHERE account_id = ?
            LIMIT 1',
            [$accountId]
        );
    }

    private static function refreshSuspension(array &$row): void
    {
        if ((string) ($row['status'] ?? '') !== 'suspended') {
            return;
        }
        $until = $row['suspended_until'] ?? null;
        if (!$until) {
            return;
        }
        if (strtotime((string) $until) >= time()) {
            return;
        }
        Query::execute(
            "UPDATE ielectro_dyscover.dyscover_users
            SET status = 'active', suspended_until = NULL, ban_reason = NULL
            WHERE id = ?",
            [(int) $row['id']]
        );
        $row['status'] = 'active';
        $row['suspended_until'] = null;
    }

    private static function assertCanAccess(array $row): void
    {
        if ((string) ($row['status'] ?? '') === 'banned') {
            Response::forbidden('Your Dyscover account is banned');
        }
    }
}
class Accounts
{
    public static function find(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $row = Query::fetch(
            'SELECT id, username FROM ielectro_account.accounts WHERE id = ? LIMIT 1',
            [$id]
        );
        return $row;
    }
    public static function findByUsername(string $username): ?array
    {
        $username = trim($username);
        if ($username === '') {
            return null;
        }
        $row = Query::fetch(
            'SELECT id, username FROM ielectro_account.accounts WHERE username = ? LIMIT 1',
            [$username]
        );
        return $row;
    }
    public static function usernamesByAccountIds(array $accountIds): array
    {
        $accountIds = array_values(array_unique(array_filter(
            array_map('intval', $accountIds),
            static fn(int $id): bool => $id > 0
        )));
        if (!$accountIds) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($accountIds), '?'));
        $rows = Query::fetchAll(
            "SELECT id, username FROM ielectro_account.accounts WHERE id IN ({$placeholders})",
            $accountIds
        );
        $map = [];
        foreach ($rows as $row) {
            $map[(int) $row['id']] = (string) $row['username'];
        }
        return $map;
    }
    public static function attachUsernames(array $rows, string $key = 'account_id'): array
    {
        $usernames = self::usernamesByAccountIds(
            array_map(
                static fn(array $row): int => (int) ($row[$key] ?? 0),
                $rows
            )
        );
        foreach ($rows as &$row) {
            $accountId = (int) ($row[$key] ?? 0);
            $row['username'] = $usernames[$accountId] ?? '';
        }
        unset($row);
        return $rows;
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
                du.account_id
            FROM ielectro_dyscover.dyscover_users du
            WHERE du.id = ?
            LIMIT 1",
            [$id]
        );
        if (!$row) {
            Response::notFound('User not found');
        }
        $account = Accounts::find((int) $row['account_id']);
        $viewerId = User::id();
        $payload = [
            'id' => (int) $row['id'],
            'account_id' => (int) $row['account_id'],
            'username' => is_array($account) ? (string) ($account['username'] ?? '') : '',
            'biography' => $row['biography'] ?? '',
            'website' => $row['website'] ?? '',
            'role' => $row['role'],
            'status' => $row['status'],
            'avatar' => Avatar::urlForAccount((int) $row['account_id']),
            'followers' => Query::count(
                'SELECT COUNT(*) FROM ielectro_dyscover.dyscover_follows WHERE followed_id = ?',
                [$id]
            ),
            'following' => Query::count(
                'SELECT COUNT(*) FROM ielectro_dyscover.dyscover_follows WHERE follower_id = ?',
                [$id]
            ),
            'created_at' => $row['created_at'],
        ];
        if ($viewerId > 0 && $viewerId !== $id) {
            $payload['follows_you'] = Query::exists(
                'SELECT 1 FROM ielectro_dyscover.dyscover_follows
                WHERE follower_id = ? AND followed_id = ?
                LIMIT 1',
                [$id, $viewerId]
            );
            $payload['viewer_following'] = Query::exists(
                'SELECT 1 FROM ielectro_dyscover.dyscover_follows
                WHERE follower_id = ? AND followed_id = ?
                LIMIT 1',
                [$viewerId, $id]
            );
        }
        return $payload;
    }
    public static function byUsername(string $username): array
    {
        $account = Accounts::findByUsername($username);
        if (!$account) {
            Response::notFound('User not found');
        }
        $row = Query::fetch(
            'SELECT id FROM ielectro_dyscover.dyscover_users WHERE account_id = ? LIMIT 1',
            [(int) $account['id']]
        );
        if (!$row) {
            Query::execute(
                'INSERT INTO ielectro_dyscover.dyscover_users(account_id) VALUES(?)',
                [(int) $account['id']]
            );
            return self::one(Query::lastId());
        }
        return self::one((int) $row['id']);
    }
}
class UserCard
{
    public static function one(int $id): array
    {
        $row = Query::fetch(
            "SELECT du.id, du.biography, du.account_id
            FROM ielectro_dyscover.dyscover_users du
            WHERE du.id = ?
            LIMIT 1",
            [$id]
        );
        if (!$row) {
            Response::notFound('User not found');
        }
        $account = Accounts::find((int) $row['account_id']);
        return [
            'id' => (int) $row['id'],
            'account_id' => (int) $row['account_id'],
            'username' => is_array($account) ? (string) ($account['username'] ?? '') : '',
            'biography' => $row['biography'] ?? '',
            'avatar' => Avatar::urlForAccount((int) $row['account_id']),
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
        $viewerId = User::id();
        $rows = Query::fetchAll(
            "SELECT du.id
            FROM ielectro_dyscover.dyscover_follows f
            INNER JOIN ielectro_dyscover.dyscover_users du ON du.id = f.follower_id
            WHERE f.followed_id = ?
            ORDER BY f.created_at DESC",
            [$id]
        );
        Response::success(array_map(
            function (array $row) use ($id, $viewerId): array {
                $followerId = (int) $row['id'];
                $card = UserCard::one($followerId);
                if ($viewerId > 0 && $viewerId === $id) {
                    $card['viewer_following'] = Query::exists(
                        'SELECT 1 FROM ielectro_dyscover.dyscover_follows
                        WHERE follower_id = ? AND followed_id = ?
                        LIMIT 1',
                        [$viewerId, $followerId]
                    );
                }
                return $card;
            },
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
        $affected = Query::execute(
            'INSERT IGNORE INTO ielectro_dyscover.dyscover_follows(follower_id, followed_id) VALUES(?, ?)',
            [$followerId, $followedId]
        );
        if ($affected > 0) {
            ActivityNotify::onFollow($followedId, $followerId);
        }
        Response::created('Followed');
    }
    private function remove(): void
    {
        Request::delete();
        $profileId = Routing::id();
        if ($profileId === null) {
            Response::badRequest('Missing user id');
        }
        $followerId = Routing::segment(4);
        if (is_string($followerId) && ctype_digit($followerId)) {
            if ($profileId !== User::id()) {
                Response::forbidden();
            }
            Query::execute(
                'DELETE FROM ielectro_dyscover.dyscover_follows
                WHERE followed_id = ? AND follower_id = ?',
                [$profileId, (int) $followerId]
            );
            Response::success('Follower removed');
        }
        Query::execute(
            'DELETE FROM ielectro_dyscover.dyscover_follows
            WHERE follower_id = ? AND followed_id = ?',
            [User::id(), $profileId]
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
            FROM ielectro_dyscover.dyscover_follows f
            INNER JOIN ielectro_dyscover.dyscover_users du ON du.id = f.followed_id
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
        $includeArchived = in_array(
            strtolower(trim((string) Request::value('include_archived', ''))),
            ['1', 'true', 'yes', 'on'],
            true
        );
        if ($includeArchived && $id !== User::id()) {
            Response::forbidden();
        }
        Response::success(PostData::listByUser($id, $includeArchived));
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
