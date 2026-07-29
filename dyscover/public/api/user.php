<?php
namespace Dyscover;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Session;
class User
{
    public static function requireAuth() {
        if (!Auth::loggedIn()) {
            return;
        }
        header('Location: '.ACCOUNT_URL.'/login?service=dyscover');
        exit();
    }
    private static function normalizeUsername($username)
    {
        return trim((string) $username);
    }
    private static function accountByUsername($username)
    {
        return Query::fetch(
            "SELECT a.id, a.username, p.biography
            FROM accounts a
            LEFT JOIN dyscover_users p ON p.user_id = a.id AND p.service = 'dyscover'
            WHERE a.username = ?
            LIMIT 1",
            [$username]
        );
    }
    private static function accountById($id)
    {
        return Query::fetch(
            "SELECT a.id, a.username, p.biography
            FROM accounts a
            LEFT JOIN dyscover_users p ON p.user_id = a.id AND p.service = 'dyscover'
            WHERE a.id = ?
            LIMIT 1",
            [$id]
        );
    }
    private static function map($row)
    {
        $id = isset($row['id']) ? (int) $row['id'] : 0;
        return [
            'avatar' => ACCOUNT_URL.'/u/'.$row['username'].'/avatar.png',
            'username' => $row['username'],
            'biography' => $row['biography'] ?? '',
            'followers' => Query::count('SELECT COUNT(*) FROM dyscover_follows WHERE followed_id = ?', [$id]),
            'followings' => Query::count('SELECT COUNT(*) FROM dyscover_follows WHERE follower_id = ?', [$id]),
            'articles' => Query::count('SELECT COUNT(*) FROM dyscover_posts WHERE user_id = ? AND type = ? AND status = ?', [$id, 'article', 'active']),
            'images' => Query::count('SELECT COUNT(*) FROM dyscover_posts WHERE user_id = ? AND type = ? AND status = ?', [$id, 'image', 'active']),
            'audios' => Query::count('SELECT COUNT(*) FROM dyscover_posts WHERE user_id = ? AND type = ? AND status = ?', [$id, 'audio', 'active']),
            'videos' => Query::count('SELECT COUNT(*) FROM dyscover_posts WHERE user_id = ? AND type = ? AND status = ?', [$id, 'video', 'active']),
            'documents' => Query::count('SELECT COUNT(*) FROM dyscover_posts WHERE user_id = ? AND type = ? AND status = ?', [$id, 'document', 'active']),
            'templates' => Query::count('SELECT COUNT(*) FROM dyscover_posts WHERE user_id = ? AND type = ? AND status = ?', [$id, 'template', 'active']),
        ];
    }
    public static function updateBiography() {
        Request::allow(['POST']);
        Auth::requireLogin();
        $biography = trim((string) Request::value('biography'));
        if (strlen($biography) > 2000) {
            Response::badRequest('Biography too long');
        }
        $id = Session::id();
        $exists = Query::exists(
            'SELECT 1 FROM dyscover_users WHERE user_id = ? AND service = ?',
            [$id, 'dyscover']
        );
        if ($exists) {
            Query::execute(
                'UPDATE dyscover_users SET biography = ? WHERE user_id = ? AND service = ?',
                [$biography, $id, 'dyscover']
            );
        } else {
            Query::execute(
                'INSERT INTO dyscover_users(user_id, service, biography) VALUES(?, ?, ?)',
                [$id, 'dyscover', $biography]
            );
        }
        Activity::notifyMentions($biography, $id, null, 'biography');
        Response::success('OK', ['biography' => $biography]);
    }
    public static function user() {
        Request::allow(['GET']);
        $username = self::normalizeUsername(Request::value('username'));
        if ($username === '') {
            Response::badRequest('Missing username');
        }
        $row = self::accountByUsername($username);
        if (!$row) {
            Response::notFound('User not found');
        }
        Response::success('OK', [self::map($row)]);
    }
    public static function search() {
        Request::allow(['GET']);
        $term = self::normalizeUsername(Request::value('term'));
        if ($term === '') {
            Response::badRequest('Missing term');
        }
        $like = '%'.$term.'%';
        $rows = Query::fetchAll(
            "SELECT a.id, a.username, p.biography
            FROM accounts a
            LEFT JOIN dyscover_users p ON p.user_id = a.id AND p.service = 'dyscover'
            WHERE a.username LIKE ?",
            [$like]
        );
        Response::success('OK', array_map([self::class, 'map'], $rows));
    }
    private static function followRelationExists($followerId, $followedId)
    {
        return Query::count(
            'SELECT COUNT(*) FROM dyscover_follows WHERE follower_id = ? AND followed_id = ?',
            [$followerId, $followedId]
        ) > 0;
    }
    public static function checkFollow() {
        Request::allow(['GET']);
        Auth::requireLogin();
        $target = self::normalizeUsername(Request::value('username'));
        if ($target === '') {
            Response::badRequest('Missing username');
        }
        $targetAccount = self::accountByUsername($target);
        if (!$targetAccount) {
            Response::notFound('User not found');
        }
        $followerId = Session::id();
        $followedId = (int) $targetAccount['id'];
        if (self::followRelationExists($followerId, $followedId)) {
            Response::success('Already following');
        }
        Response::error('Not following');
    }
    public static function follow() {
        Request::allow(['POST']);
        Auth::requireLogin();
        $target = self::normalizeUsername(Request::value('username'));
        if ($target === '') {
            Response::badRequest('Missing username');
        }
        $targetAccount = self::accountByUsername($target);
        if (!$targetAccount) {
            Response::notFound('User not found');
        }
        $id = Session::id();
        $targetId = (int) $targetAccount['id'];
        if ($id === $targetId) {
            Response::badRequest('You cannot follow yourself');
        }
        if (self::followRelationExists($id, $targetId)) {
            Response::conflict('Already following');
        }
        Query::execute(
            'INSERT INTO dyscover_follows(follower_id, followed_id) VALUES(?, ?)',
            [$id, $targetId]
        );
        Activity::create($targetId, $id, 'follow', null, null);
        Response::success('Followed');
    }
    public static function unfollow() {
        Request::allow(['POST']);
        Auth::requireLogin();
        $target = self::normalizeUsername(Request::value('username'));
        if ($target === '') {
            Response::badRequest('Missing username');
        }
        $targetAccount = self::accountByUsername($target);
        if (!$targetAccount) {
            Response::notFound('User not found');
        }
        $id = Session::id();
        $targetId = (int) $targetAccount['id'];
        if ($id === $targetId) {
            Response::badRequest('You cannot unfollow yourself');
        }
        Query::execute(
            'DELETE FROM dyscover_follows WHERE follower_id = ? AND followed_id = ?',
            [$id, $targetId]
        );
        Activity::create($targetId, $id, 'follow', null, 'unfollow');
        Response::success('Unfollowed');
    }
    public static function removeFollower() {
        Request::allow(['POST']);
        Auth::requireLogin();
        $target = self::normalizeUsername(Request::value('username'));
        if ($target === '') {
            Response::badRequest('Missing username');
        }
        $targetAccount = self::accountByUsername($target);
        if (!$targetAccount) {
            Response::notFound('User not found');
        }
        $id = Session::id();
        $targetId = (int) $targetAccount['id'];
        if ($id === $targetId) {
            Response::badRequest('Invalid action');
        }
        Query::execute(
            'DELETE FROM dyscover_follows WHERE follower_id = ? AND followed_id = ?',
            [$targetId, $id]
        );
        Response::success('Follower removed');
    }
    public static function followersList() {
        Request::allow(['GET']);
        Auth::requireLogin();
        $username = self::normalizeUsername(Request::value('username'));
        if ($username === '') {
            Response::badRequest('Missing username');
        }
        $account = self::accountByUsername($username);
        if (!$account) {
            Response::notFound('User not found');
        }
        $rows = Query::fetchAll(
            "SELECT a.id, a.username, p.biography
            FROM dyscover_follows f
            JOIN accounts a ON a.id = f.follower_id
            LEFT JOIN dyscover_users p ON p.user_id = a.id AND p.service = 'dyscover'
            WHERE f.followed_id = ?
            ORDER BY a.username ASC",
            [(int) $account['id']]
        );
        Response::success('OK', array_map([self::class, 'map'], $rows));
    }
    public static function followingsList() {
        Request::allow(['GET']);
        Auth::requireLogin();
        $username = self::normalizeUsername(Request::value('username'));
        if ($username === '') {
            Response::badRequest('Missing username');
        }
        $account = self::accountByUsername($username);
        if (!$account) {
            Response::notFound('User not found');
        }
        $rows = Query::fetchAll(
            "SELECT a.id, a.username, p.biography
            FROM dyscover_follows f
            JOIN accounts a ON a.id = f.followed_id
            LEFT JOIN dyscover_users p ON p.user_id = a.id AND p.service = 'dyscover'
            WHERE f.follower_id = ?
            ORDER BY a.username ASC",
            [(int) $account['id']]
        );
        Response::success('OK', array_map([self::class, 'map'], $rows));
    }
}
