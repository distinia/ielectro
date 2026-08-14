<?php
namespace Admin;
use Dyscover\Moderation;
use Nesh\Avatar;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Schema;
use Nesh\Validate;
require_once __DIR__ . '/access.php';
require_once __DIR__ . '/../../dyscover/api/moderation.php';
class Dyscover
{
    public function overview(): void
    {
        Request::get();
        Access::requireMember();
        Response::success([
            'pending_reports' => self::countSafe(
                'SELECT COUNT(*) FROM ' . Schema::DYSCOVER_REPORTS . " WHERE status = 'pending'"
            ),
            'banned_users' => self::countSafe(
                "SELECT COUNT(*) FROM " . Schema::DYSCOVER_USERS . " WHERE status = 'banned'"
            ),
            'suspended_users' => self::countSafe(
                "SELECT COUNT(*) FROM " . Schema::DYSCOVER_USERS . " WHERE status = 'suspended'"
            ),
            'banned_terms' => self::countSafe(
                'SELECT COUNT(*) FROM ' . Schema::DYSCOVER_BANNED_TERMS
            ),
        ]);
    }
    public function reports(): void
    {
        Request::get();
        Access::requireMember();
        $status = trim((string) Request::value('status', 'pending'));
        if (!Validate::in($status, ['pending', 'reviewed', 'dismissed', 'actioned', 'all'])) {
            $status = 'pending';
        }
        $where = $status === 'all' ? '1=1' : 'r.status = ?';
        $params = $status === 'all' ? [] : [$status];
        $rows = self::fetchSafe(
            'SELECT
                r.id,
                r.target_type,
                r.target_post_id,
                r.target_user_id,
                r.reason,
                r.details,
                r.status,
                r.review_note,
                r.created_at,
                r.reviewed_at,
                rep.id AS reporter_id,
                rep_acc.username AS reporter_username,
                tgt_acc.username AS target_username,
                p.title AS post_title
            FROM ' . Schema::DYSCOVER_REPORTS . ' r
            INNER JOIN ' . Schema::DYSCOVER_USERS . ' rep ON rep.id = r.reporter_user_id
            INNER JOIN ' . Schema::ACCOUNTS . ' rep_acc ON rep_acc.id = rep.account_id
            LEFT JOIN ' . Schema::DYSCOVER_USERS . ' tgt ON tgt.id = r.target_user_id
            LEFT JOIN ' . Schema::ACCOUNTS . ' tgt_acc ON tgt_acc.id = tgt.account_id
            LEFT JOIN ' . Schema::DYSCOVER_POSTS . ' p ON p.id = r.target_post_id
            WHERE ' . $where . '
            ORDER BY r.id DESC
            LIMIT 80',
            $params
        );
        Response::success(array_map(static function (array $row): array {
            return [
                'id' => (int) $row['id'],
                'target_type' => $row['target_type'],
                'target_post_id' => $row['target_post_id'] ? (int) $row['target_post_id'] : null,
                'target_user_id' => $row['target_user_id'] ? (int) $row['target_user_id'] : null,
                'reason' => $row['reason'],
                'reason_label' => Moderation::reasonLabel((string) $row['reason']),
                'details' => $row['details'],
                'status' => $row['status'],
                'review_note' => $row['review_note'],
                'created_at' => $row['created_at'],
                'reviewed_at' => $row['reviewed_at'],
                'reporter' => [
                    'id' => (int) $row['reporter_id'],
                    'username' => (string) $row['reporter_username'],
                ],
                'target_username' => $row['target_username'],
                'post_title' => $row['post_title'],
            ];
        }, $rows));
    }
    public function reportReview(): void
    {
        Request::post();
        Access::requireMember();
        $reportId = (int) Request::value('report_id');
        $status = trim((string) Request::value('status', 'reviewed'));
        $note = trim((string) Request::value('review_note', ''));
        if ($reportId <= 0) {
            Response::badRequest('Missing report id');
        }
        if (!Validate::in($status, ['reviewed', 'dismissed', 'actioned'])) {
            Response::badRequest('Invalid status');
        }
        Query::execute(
            'UPDATE ' . Schema::DYSCOVER_REPORTS . '
            SET status = ?, review_note = ?, reviewed_at = NOW()
            WHERE id = ?',
            [$status, $note !== '' ? $note : null, $reportId]
        );
        Response::success(['message' => 'Report updated']);
    }
    public function users(): void
    {
        Request::get();
        Access::requireMember();
        $query = trim((string) Request::value('q', ''));
        $status = trim((string) Request::value('status', 'all'));
        $where = ['1=1'];
        $params = [];
        if ($status !== 'all') {
            $where[] = 'du.status = ?';
            $params[] = $status;
        }
        if ($query !== '') {
            $where[] = '(a.username LIKE ? OR a.email LIKE ?)';
            $like = '%' . $query . '%';
            $params[] = $like;
            $params[] = $like;
        }
        $rows = Query::fetchAll(
            'SELECT
                du.id,
                du.status,
                du.suspended_until,
                du.ban_reason,
                du.created_at,
                a.id AS account_id,
                a.username,
                a.email,
                a.name,
                a.surname,
                (
                    SELECT COUNT(*) FROM ' . Schema::DYSCOVER_POSTS . ' p
                    WHERE p.user_id = du.id AND p.status != ?
                ) AS posts_count
            FROM ' . Schema::DYSCOVER_USERS . ' du
            INNER JOIN ' . Schema::ACCOUNTS . ' a ON a.id = du.account_id
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY du.id DESC
            LIMIT 60',
            array_merge($params, ['removed'])
        );
        Response::success(array_map([self::class, 'mapDyscoverUser'], $rows));
    }
    public function moderateUser(): void
    {
        Request::post();
        Access::requireMember();
        $userId = (int) Request::value('user_id');
        $action = trim((string) Request::value('action', ''));
        $reason = trim((string) Request::value('reason', ''));
        $days = (int) Request::value('days', 7);
        if ($userId <= 0) {
            Response::badRequest('Missing user id');
        }
        if (!Validate::in($action, ['ban', 'suspend', 'activate'])) {
            Response::badRequest('Invalid action');
        }
        if ($action === 'ban') {
            Query::execute(
                "UPDATE " . Schema::DYSCOVER_USERS . "
                SET status = 'banned', suspended_until = NULL, ban_reason = ?
                WHERE id = ?",
                [$reason !== '' ? $reason : 'Banned by admin', $userId]
            );
        } elseif ($action === 'suspend') {
            $days = max(1, min(365, $days));
            Query::execute(
                "UPDATE " . Schema::DYSCOVER_USERS . "
                SET status = 'suspended',
                    suspended_until = DATE_ADD(NOW(), INTERVAL ? DAY),
                    ban_reason = ?
                WHERE id = ?",
                [$days, $reason !== '' ? $reason : 'Suspended by admin', $userId]
            );
        } else {
            Query::execute(
                "UPDATE " . Schema::DYSCOVER_USERS . "
                SET status = 'active', suspended_until = NULL, ban_reason = NULL
                WHERE id = ?",
                [$userId]
            );
        }
        Response::success(['message' => 'User updated']);
    }
    public function trends(): void
    {
        Request::get();
        Access::requireMember();
        $tagRows = self::fetchSafe(
            'SELECT
                t.name,
                COUNT(pt.post_id) AS uses_7d,
                COALESCE(SUM(ps.views), 0) AS views_7d
            FROM ' . Schema::DYSCOVER_TAGS . ' t
            INNER JOIN ' . Schema::DYSCOVER_POST_TAGS . ' pt ON pt.tag_id = t.id
            INNER JOIN ' . Schema::DYSCOVER_POSTS . ' p ON p.id = pt.post_id
            LEFT JOIN ' . Schema::DYSCOVER_POST_STATISTICS . ' ps ON ps.post_id = p.id
            WHERE p.status = ?
            AND p.published_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY t.id, t.name
            ORDER BY views_7d DESC, uses_7d DESC
            LIMIT 15',
            ['active']
        );
        $postRows = self::fetchSafe(
            'SELECT
                p.id,
                p.title,
                p.type,
                p.published_at,
                a.username,
                COALESCE(ps.views, 0) AS views,
                COALESCE(ps.likes, 0) AS likes,
                COALESCE(ps.comments, 0) AS comments,
                COALESCE(ps.shares, 0) AS shares
            FROM ' . Schema::DYSCOVER_POSTS . ' p
            INNER JOIN ' . Schema::DYSCOVER_USERS . ' du ON du.id = p.user_id
            INNER JOIN ' . Schema::ACCOUNTS . ' a ON a.id = du.account_id
            LEFT JOIN ' . Schema::DYSCOVER_POST_STATISTICS . ' ps ON ps.post_id = p.id
            WHERE p.status = ?
            AND p.published_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY (COALESCE(ps.views, 0) + COALESCE(ps.likes, 0) * 3 + COALESCE(ps.comments, 0) * 4) DESC
            LIMIT 15',
            ['active']
        );
        Response::success([
            'tags' => array_map(static fn(array $row): array => [
                'name' => $row['name'],
                'uses_7d' => (int) $row['uses_7d'],
                'views_7d' => (int) $row['views_7d'],
            ], $tagRows),
            'posts' => array_map(static fn(array $row): array => [
                'id' => (int) $row['id'],
                'title' => $row['title'],
                'type' => $row['type'],
                'username' => $row['username'],
                'published_at' => $row['published_at'],
                'views' => (int) $row['views'],
                'likes' => (int) $row['likes'],
                'comments' => (int) $row['comments'],
                'shares' => (int) $row['shares'],
                'score' => (int) $row['views'] + (int) $row['likes'] * 3 + (int) $row['comments'] * 4,
            ], $postRows),
        ]);
    }
    public function terms(): void
    {
        Request::get();
        Access::requireMember();
        $rows = self::fetchSafe(
            'SELECT id, term, match_type, reason, created_at
            FROM ' . Schema::DYSCOVER_BANNED_TERMS . '
            ORDER BY term ASC'
        );
        Response::success($rows);
    }
    public function termSave(): void
    {
        Request::post();
        Access::requireMember();
        $id = (int) Request::value('id');
        $term = mb_strtolower(trim((string) Request::value('term', '')));
        $matchType = trim((string) Request::value('match_type', 'contains'));
        $reason = trim((string) Request::value('reason', ''));
        if ($term === '') {
            Response::badRequest('Missing term');
        }
        if (!Validate::in($matchType, ['exact', 'contains', 'word'])) {
            Response::badRequest('Invalid match type');
        }
        if ($id > 0) {
            Query::execute(
                'UPDATE ' . Schema::DYSCOVER_BANNED_TERMS . '
                SET term = ?, match_type = ?, reason = ?
                WHERE id = ?',
                [$term, $matchType, $reason !== '' ? $reason : null, $id]
            );
        } else {
            Query::execute(
                'INSERT INTO ' . Schema::DYSCOVER_BANNED_TERMS . '(term, match_type, reason)
                VALUES (?, ?, ?)',
                [$term, $matchType, $reason !== '' ? $reason : null]
            );
        }
        Response::success(['message' => 'Term saved']);
    }
    public function termDelete(): void
    {
        Request::post();
        Access::requireMember();
        $id = (int) Request::value('id');
        if ($id <= 0) {
            Response::badRequest('Missing term id');
        }
        Query::execute('DELETE FROM ' . Schema::DYSCOVER_BANNED_TERMS . ' WHERE id = ?', [$id]);
        Response::success(['message' => 'Term deleted']);
    }
    public function posts(): void
    {
        Request::get();
        Access::requireMember();
        $query = trim((string) Request::value('q', ''));
        $where = ["p.status IN ('active', 'hidden')"];
        $params = [];
        if ($query !== '') {
            $where[] = '(p.title LIKE ? OR a.username LIKE ?)';
            $like = '%' . $query . '%';
            $params[] = $like;
            $params[] = $like;
        }
        $rows = Query::fetchAll(
            'SELECT
                p.id,
                p.title,
                p.type,
                p.status,
                p.published_at,
                du.id AS user_id,
                a.username,
                COALESCE(ps.views, 0) AS views
            FROM ' . Schema::DYSCOVER_POSTS . ' p
            INNER JOIN ' . Schema::DYSCOVER_USERS . ' du ON du.id = p.user_id
            INNER JOIN ' . Schema::ACCOUNTS . ' a ON a.id = du.account_id
            LEFT JOIN ' . Schema::DYSCOVER_POST_STATISTICS . ' ps ON ps.post_id = p.id
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY p.published_at DESC
            LIMIT 50',
            $params
        );
        Response::success($rows);
    }
    public function postRemove(): void
    {
        Request::post();
        Access::requireMember();
        $postId = (int) Request::value('post_id');
        if ($postId <= 0) {
            Response::badRequest('Missing post id');
        }
        Query::execute(
            "UPDATE " . Schema::DYSCOVER_POSTS . " SET status = 'removed' WHERE id = ?",
            [$postId]
        );
        Response::success(['message' => 'Post removed']);
    }
    private static function mapDyscoverUser(array $row): array
    {
        $accountId = (int) $row['account_id'];
        $name = trim(((string) ($row['name'] ?? '')) . ' ' . ((string) ($row['surname'] ?? '')));
        return [
            'id' => (int) $row['id'],
            'account_id' => $accountId,
            'username' => (string) $row['username'],
            'email' => (string) $row['email'],
            'display_name' => $name !== '' ? $name : (string) $row['username'],
            'status' => (string) $row['status'],
            'suspended_until' => $row['suspended_until'],
            'ban_reason' => $row['ban_reason'],
            'posts_count' => (int) $row['posts_count'],
            'created_at' => $row['created_at'],
            'avatar' => Avatar::url($accountId),
        ];
    }
    private static function countSafe(string $sql, array $params = []): int
    {
        try {
            return (int) Query::count($sql, $params);
        } catch (\Throwable) {
            return 0;
        }
    }
    private static function fetchSafe(string $sql, array $params = []): array
    {
        try {
            return Query::fetchAll($sql, $params);
        } catch (\Throwable) {
            return [];
        }
    }
}
