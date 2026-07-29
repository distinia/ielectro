<?php
namespace Account;
use Account\AuthSession;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Session;
class Devices
{
    public function index(): void
    {
        Request::dispatch([
            'GET' => [$this, 'list'],
            'DELETE' => [$this, 'remove']
        ]);
    }
    public function list(): void
    {
        Response::success(
            Query::fetchAll(
                "SELECT
                    id,
                    ip_address,
                    browser,
                    os,
                    device_info,
                    city,
                    country,
                    last_activity,
                    created_at,
                    expires_at
                FROM account_sessions
                WHERE account_id = ?
                ORDER BY last_activity DESC",
                [Session::userId()]
            )
        );
    }
    public function remove(): void
    {
        $sessionId = (int) Request::value('session_id');
       if ($sessionId > 0) {
            if (!AuthSession::revoke($sessionId)) {
                Response::notFound('Device not found');
            }
           Response::success('Device disconnected');
        }
       AuthSession::revokeAll();
        Response::success('All devices disconnected');
    }
}