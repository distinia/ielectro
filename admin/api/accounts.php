<?php
namespace Admin;
use Nesh\Avatar;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Schema;
require_once __DIR__ . '/access.php';
class Accounts
{
    public function index(): void
    {
        Request::get();
        Access::requireMember();
        $query = trim((string) Request::value('q', ''));
        if (mb_strlen($query) < 2) {
            Response::success([]);
        }
        $like = '%' . $query . '%';
        $rows = Query::fetchAll(
            'SELECT
                id,
                username,
                email,
                name,
                surname,
                created_at,
                email_verified_at,
                deletion_scheduled_at
            FROM ' . Schema::ACCOUNTS . '
            WHERE (
                username LIKE ?
                OR email LIKE ?
                OR CONCAT(COALESCE(name, ""), " ", COALESCE(surname, "")) LIKE ?
            )
            ORDER BY username ASC
            LIMIT 20',
            [$like, $like, $like]
        );
        Response::success(array_map([self::class, 'mapAccount'], $rows));
    }
    public function log(): void
    {
        Request::get();
        Access::requireMember();
        $filter = trim((string) Request::value('filter', 'all'));
        $query = trim((string) Request::value('q', ''));
        $limit = min(100, max(10, (int) Request::value('limit', 50)));
        $where = ['1=1'];
        $params = [];
        if ($filter === 'failed') {
            $where[] = "(aa.action = 'login_failed' OR (aa.action = 'login' AND aa.account_id IS NULL))";
        } elseif ($filter === 'updates') {
            $where[] = "aa.action IN (
                'profile_updated', 'email_changed', 'password_changed',
                'username_changed', 'phone_number_changed', 'email_verified'
            )";
        } elseif ($filter === 'security') {
            $where[] = "aa.action IN ('login', 'login_failed', 'logout', 'session_revoked', 'password_reset')";
        }
        if ($query !== '') {
            $where[] = '(a.username LIKE ? OR a.email LIKE ? OR aa.details LIKE ?)';
            $like = '%' . $query . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }
        $sql = 'SELECT
                aa.id,
                aa.action,
                aa.details,
                aa.ip_address,
                aa.device_info,
                aa.created_at,
                a.id AS account_id,
                a.username,
                a.email,
                a.name,
                a.surname
            FROM ' . Schema::ACCOUNT_ACTIVITY . ' aa
            LEFT JOIN ' . Schema::ACCOUNTS . ' a ON a.id = aa.account_id
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY aa.id DESC
            LIMIT ?';
        $params[] = $limit;
        $rows = Query::fetchAll($sql, $params);
        Response::success([
            'items' => array_map(static function (array $row): array {
                return [
                    'id' => (int) $row['id'],
                    'action' => (string) $row['action'],
                    'details' => $row['details'],
                    'ip_address' => $row['ip_address'],
                    'device_info' => $row['device_info'],
                    'created_at' => $row['created_at'],
                    'account' => $row['account_id']
                        ? self::mapAccount($row)
                        : null,
                ];
            }, $rows),
            'stats' => self::logStats(),
        ]);
    }
    public function hardDelete(): void
    {
        Request::post();
        Access::requireMember();
        $username = trim((string) Request::value('username', ''));
        if ($username === '') {
            Response::badRequest('Missing username');
        }
        $row = Query::fetch(
            'SELECT id, username FROM ' . Schema::ACCOUNTS . ' WHERE username = ? LIMIT 1',
            [$username]
        );
        if (!$row) {
            Response::notFound('Account not found');
        }
        Query::execute(
            'DELETE FROM ' . Schema::ACCOUNTS . ' WHERE id = ?',
            [(int) $row['id']]
        );
        Response::success(['message' => 'Account permanently deleted']);
    }
    private static function logStats(): array
    {
        $activity = Schema::ACCOUNT_ACTIVITY;
        return [
            'failed_24h' => (int) Query::count(
                "SELECT COUNT(*) FROM {$activity}
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
                AND (
                    action = 'login_failed'
                    OR (action = 'login' AND account_id IS NULL)
                )"
            ),
            'updates_7d' => (int) Query::count(
                "SELECT COUNT(*) FROM {$activity}
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                AND action IN (
                    'profile_updated', 'email_changed', 'password_changed',
                    'username_changed', 'phone_number_changed'
                )"
            ),
            'scheduled_deletions' => (int) Query::count(
                'SELECT COUNT(*) FROM ' . Schema::ACCOUNTS . '
                WHERE deletion_scheduled_at IS NOT NULL'
            ),
        ];
    }
    private static function mapAccount(array $row): array
    {
        $name = trim(((string) ($row['name'] ?? '')) . ' ' . ((string) ($row['surname'] ?? '')));
        $id = (int) ($row['account_id'] ?? $row['id']);
        return [
            'id' => $id,
            'username' => (string) ($row['username'] ?? ''),
            'email' => (string) ($row['email'] ?? ''),
            'display_name' => $name !== '' ? $name : (string) ($row['username'] ?? ''),
            'created_at' => $row['created_at'] ?? null,
            'verified' => ($row['email_verified_at'] ?? null) !== null,
            'deletion_scheduled_at' => $row['deletion_scheduled_at'] ?? null,
            'avatar' => Avatar::url($id),
        ];
    }
}
