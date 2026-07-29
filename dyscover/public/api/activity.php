<?php
namespace Dyscover;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Schema;
use Nesh\Session;
use Nesh\Validate;
class Activity
{
    public static function create(mixed $arg1, mixed $arg2, mixed $arg3, mixed $arg4, mixed $arg5) {
        if ((int) $recipientId === (int) $actorId) {
            return;
        }
        Query::execute(
            "INSERT INTO dyscover_activity(recipient_id, actor_id, post_id, type, body)
            VALUES (?, ?, ?, ?, ?)",
            [
                (string) $recipientId,
                (string) $actorId,
                $postId ? (string) $postId : null,
                $type,
                $body
            ]
        );
    }
    public static function notifyMentions(string $text, int $actorId, ?int $postId = null, string $context = '') {
        if (!preg_match_all('/@([a-zA-Z0-9_]{2,32})/', $text, $matches)) {
            return;
        }
        $usernames = array_unique($matches[1]);
        $preview = trim($context) !== '' ? $context : $text;
        if (mb_strlen($preview) > 200) {
            $preview = mb_substr($preview, 0, 197).'...';
        }
        foreach ($usernames as $username) {
            $account = Query::fetch(
                'SELECT id FROM accounts WHERE username = ? LIMIT 1',
                [$username]
            );
            if (!$account) {
                continue;
            }
            $recipientId = (int) $account['id'];
            self::create($recipientId, $actorId, 'mention', $postId, $preview);
        }
    }
    public static function list(mixed $arg1) {
        Request::allow(['GET']);
        Auth::requireLogin();
        $limit = max(1, min(200, (int) $limit));
        $rows = Query::fetchAll(
            "SELECT
                n.*,
                a.username
            FROM dyscover_activity n
            LEFT JOIN accounts a
                ON a.id = n.actor_id
            WHERE n.recipient_id = ?
            ORDER BY n.id DESC
            LIMIT ".$limit,
            [(string) Session::id()]
        );
        $out = [];
        foreach ($rows as $row) {
            $post = null;
            if (!empty($row['post_id'])) {
                $post = Query::fetch(
                    "SELECT *
                     FROM dyscover_posts
                     WHERE id = ?",
                    [(string) $row['post_id']]
                );
            }
            $out[] = [
                'id' => (int) $row['id'],
                'recipient_id' => (int) $row['recipient_id'],
                'actor_id' => (int) $row['actor_id'],
                'actor_username' => $row['username'] ?? '',
                'actor_avatar' => Avatar::url($row['username'] ?? ''),
                'post_id' => $row['post_id'] ? (int) $row['post_id'] : null,
                'post' => $post,
                'type' => $row['type'],
                'body' => $row['body'],
                'read' => $row['read_at'] !== null,
                'read_at' => $row['read_at'],
                'created_at' => $row['created_at']
            ];
        }
        Response::success('OK', $out);
    }
    public static function unreadCount() {
        Request::allow(['GET']);
        Auth::requireLogin();
        $activity = Query::count(
            "SELECT COUNT(*)
            FROM dyscover_activity
            WHERE recipient_id = ?
            AND read_at IS NULL",
            [Session::id()]
        );
        $chat = 0;
        if (Schema::columnExists('dyscover_inbox_messages', 'read_at')) {
            $chat = Query::count(
                'SELECT COUNT(*)
                FROM dyscover_inbox_messages m
                INNER JOIN dyscover_inbox_conversations t ON t.id = m.thread_id
                WHERE m.sender_id != ?
                AND m.read_at IS NULL
                AND (
                    t.user_one_id = ?
                    OR t.user_two_id = ?
                )',
                [Session::id(), Session::id(), Session::id()]
            );
        }
        Response::success('OK', [
            'activity' => (int) $activity,
            'chat' => (int) $chat
        ]);
    }
    public static function markAllRead() {
        Request::allow(['POST']);
        Auth::requireLogin();
        Query::execute(
            "UPDATE dyscover_activity
             SET read_at = CURRENT_TIMESTAMP
             WHERE recipient_id = ?
             AND read_at IS NULL",
            [(string) Session::id()]
        );
        Response::success('OK');
    }
    public static function markOneRead() {
        Request::allow(['POST']);
        Auth::requireLogin();
        $id = (int) Request::value('id');
        if ($id <= 0) {
            Response::badRequest('Invalid id');
        }
        Query::execute(
            "UPDATE dyscover_activity
             SET read_at = CURRENT_TIMESTAMP
             WHERE id = ?
             AND recipient_id = ?
             AND read_at IS NULL",
            [
                (string) $id,
                (string) Session::id()
            ]
        );
        Response::success('OK');
    }
    public static function since() {
        Request::allow(['GET']);
        Auth::requireLogin();
        if (Request::value('bootstrap')) {
            $row = Query::fetch(
                'SELECT COALESCE(MAX(id), 0) AS max_id FROM dyscover_activity WHERE recipient_id = ?',
                [(string) Session::id()]
            );
            Response::success('OK', ['max_id' => (int) ($row['max_id'] ?? 0)]);
            return;
        }
        $afterId = (int) Request::value('after_id');
        $rows = Query::fetchAll(
            "SELECT
                n.*,
                a.username
            FROM dyscover_activity n
            LEFT JOIN accounts a
                ON a.id = n.actor_id
            WHERE n.recipient_id = ?
            AND n.id > ?
            ORDER BY n.id ASC
            LIMIT 10",
            [(string) Session::id(), $afterId]
        );
        $out = [];
        foreach ($rows as $row) {
            $post = null;
            if (!empty($row['post_id'])) {
                $post = Query::fetch(
                    "SELECT *
                     FROM dyscover_posts
                     WHERE id = ?",
                    [(string) $row['post_id']]
                );
            }
            $out[] = [
                'id' => (int) $row['id'],
                'recipient_id' => (int) $row['recipient_id'],
                'actor_id' => (int) $row['actor_id'],
                'actor_username' => $row['username'] ?? '',
                'actor_avatar' => Avatar::url($row['username'] ?? ''),
                'post_id' => $row['post_id'] ? (int) $row['post_id'] : null,
                'post' => $post,
                'type' => $row['type'],
                'body' => $row['body'],
                'read' => $row['read_at'] !== null,
                'read_at' => $row['read_at'],
                'created_at' => $row['created_at']
            ];
        }
        Response::success('OK', $out);
    }
    public static function delete(mixed $arg1) {
        Auth::requireLogin();
        if (!Validate::integer($id)) {
            Response::badRequest('Invalid id');
        }
        Query::execute(
            "DELETE FROM dyscover_activity
             WHERE id = ?
             AND recipient_id = ?",
            [
                (string) $id,
                (string) Session::id()
            ]
        );
        Response::success('OK');
    }
}
