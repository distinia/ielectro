<?php
namespace Account;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Session;
class Activity
{
    public static function log(int $accountId, string $action, string $details): void 
    {
        Query::execute(
            "INSERT INTO account_activity(account_id, action, details, ip_address, device_info)
            VALUES (?, ?, ?, ?, ?)",
            [
                $accountId,
                $action,
                $details,
                Request::ip(),
                Request::userAgent()
            ]
        );
    }
    public function index(): void
    {
        Request::get();
        $limit = max(1, min(100, (int) Request::value('limit', 50)));
        $offset = max(0, (int) Request::value('offset', 0));
        Response::success(
            Query::fetchAll(
                "SELECT id, action, details, ip_address, device_info, created_at
                FROM account_activity
                WHERE account_id = ?
                ORDER BY id DESC
                LIMIT ? OFFSET ?",
                [
                    Session::userId(),
                    $limit,
                    $offset
                ]
            )
        );
    }
    public function dashboard(): void
    {
        Request::get();
        $accountId = Session::userId();
        Response::success([
            'active_sessions' => Query::count(
                "SELECT COUNT(*)
                FROM account_sessions
                WHERE account_id = ?
                AND revoked_at IS NULL
                AND expires_at > NOW()",
                [$accountId]
            ),
            'activity_count' => Query::count(
                "SELECT COUNT(*)
                FROM account_activity
                WHERE account_id = ?",
                [$accountId]
            ),
            'recent_activity' => Query::fetchAll(
                "SELECT action, details, created_at
                FROM account_activity
                WHERE account_id = ?
                ORDER BY id DESC
                LIMIT 10",
                [$accountId]
            )
        ]);
    }
}