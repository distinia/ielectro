<?php
namespace Admin;

use Nesh\Identity;
use Nesh\Query;
use Nesh\Response;
use Nesh\Url;

class Access
{
    public static function member(?int $accountId = null): ?array
    {
        $accountId = $accountId ?? Identity::id();
        if (!$accountId) {
            return null;
        }

        $row = Query::fetch(
            'SELECT
                t.id,
                t.uuid,
                t.account_id,
                t.role_text,
                t.status,
                a.username,
                TRIM(CONCAT(COALESCE(a.name, ""), " ", COALESCE(a.surname, ""))) AS account_name
            FROM ielectro_admin.team t
            LEFT JOIN ' . \Nesh\Schema::ACCOUNTS . ' a ON a.id = t.account_id
            WHERE t.account_id = ?
            AND t.status = ?
            LIMIT 1',
            [$accountId, 'active']
        );

        if (!$row) {
            return null;
        }

        $name = trim((string) ($row['account_name'] ?? ''));
        if ($name === '') {
            $name = (string) ($row['username'] ?? '');
        }

        return [
            'id' => (int) $row['id'],
            'uuid' => $row['uuid'],
            'account_id' => (int) $row['account_id'],
            'full_name' => $name,
            'role_text' => $row['role_text'],
        ];
    }

    public static function requireMember(): void
    {
        Identity::required();
        if (!self::member()) {
            Response::forbidden('Admin access required');
        }
    }

    public static function requirePage(): void
    {
        if (!Identity::id()) {
            $return = urlencode(
                (string) ($_SERVER['REQUEST_URI'] ?? '/')
            );
            Url::redirect(
                'https://account.ielectro.com/login?service=admin&return=' . $return
            );
        }

        if (!self::member()) {
            http_response_code(403);
            header('Content-Type: text/html; charset=utf-8');
            echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Access denied</title><link rel="stylesheet" href="' . APP_URL . '/styles/core/index.css"></head><body class="admin-denied"><div class="admin-denied-card"><h1>Access denied</h1><p>Your account is not linked to an active iElectro team profile.</p><p><a href="https://account.ielectro.com/">Back to Account</a></p></div></body></html>';
            exit;
        }
    }
}
