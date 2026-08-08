<?php
namespace Account;
use Nesh\Cookie;
use Nesh\Generate;
use Nesh\Geolocation;
use Nesh\Identity;
use Nesh\Password;
use Nesh\Query;
use Nesh\RateLimit;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
use Nesh\Validate;
class Sessions
{
    public function index(): void
    {
        Routing::method([
            'GET'    => fn() => $this->list(),
            'POST'   => fn() => $this->create(),
            'PUT'    => fn() => $this->refresh(),
            'DELETE' => fn() => $this->destroy(),
        ]);
    }
    private function list(): void
    {
        Request::get();
        $currentSessionId = Identity::sessionId();
        $rows = Query::fetchAll(
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
            FROM ielectro_account.account_sessions
            WHERE account_id = ?
            AND revoked_at IS NULL
            AND expires_at > NOW()
            ORDER BY last_activity DESC",
            [Identity::id()]
        );

        foreach ($rows as &$row) {
            $row['is_current'] = $currentSessionId !== null
                && (int) $row['id'] === (int) $currentSessionId;
        }
        unset($row);

        Response::success($rows);
    }
    private function destroy(): void
    {
        Request::delete();
        $accountId = Identity::id();
        $sessionId = (int) Request::value('session_id');
        if ($sessionId > 0) {
            if (!Session::revoke($sessionId)) {
                Response::notFound('Session not found');
            }
            $currentSessionRevoked = $sessionId === Identity::sessionId();
            if ($currentSessionRevoked) {
                Session::clearCookie();
            }
            Activity::log(
                $accountId,
                'session_revoked',
                'Revoked session id ' . $sessionId
            );
            Response::success([
                'message' => 'Session disconnected',
                'current_session_revoked' => $currentSessionRevoked,
            ]);
        }
        Session::destroy();
        Activity::log(
            $accountId,
            'logout',
            'User logged out'
        );
        Response::success('Logged out successfully');
    }
    private function create(): void
    {
        Request::post();
        RateLimit::check('login', 30, 900);
        $input = Request::body();
        $identifier = trim((string) ($input['identifier'] ?? ''));
        $password = (string) ($input['password'] ?? '');
        if (!Validate::required($identifier) || !Validate::required($password)) {
            Response::badRequest('Username or email and password are required');
        }
        RateLimit::check('login', 8, 900, $identifier);
        $account = Query::fetch(
            "SELECT id, password_hash
            FROM ielectro_account.accounts
            WHERE (username = ? OR email = ?)
            AND deletion_scheduled_at IS NULL
            LIMIT 1",
            [$identifier, $identifier]
        );
        if (
            !$account
            || $account['password_hash'] === null
            || !Password::verify($password, $account['password_hash'])
        ) {
            Activity::log(
                null,
                'login',
                'Invalid credentials for ' . $identifier
            );
            Response::unauthorized('Invalid username, email or password');
        }
        $accountId = (int) $account['id'];
        Session::revokeAllFor($accountId);
        Session::create($accountId);
        Activity::log($accountId, 'login', 'Login from password');
        Response::success('Signed in successfully');
    }
    private function refresh(): void
    {
        Request::put();
        Session::refresh();
        Response::success('Session refreshed');
    }
    public function all(): void
    {
        Request::delete();
        $accountId = Identity::id();
        Session::revokeAllFor($accountId, Session::token());
        Activity::log(
            $accountId,
            'session_revoked',
            'Revoked all other sessions'
        );
        Response::success('All other sessions disconnected');
    }
}
class Session
{
    private const COOKIE = 'session_token';
    public static function create(int $accountId): void
    {
        $token = Generate::token();
        $tokenHash = Generate::hash($token);
        $location = new Geolocation(Request::ip());
        Query::execute(
            "INSERT INTO ielectro_account.account_sessions(
                account_id,
                token_hash,
                ip_address,
                browser,
                os,
                device_info,
                city,
                country,
                expires_at
            )
            VALUES(
                ?, ?, ?, ?, ?, ?, ?, ?,
                DATE_ADD(NOW(), INTERVAL ? SECOND)
            )",
            [
                $accountId,
                $tokenHash,
                Request::ip(),
                Request::browser(),
                Request::os(),
                Request::userAgent(),
                $location->city(),
                $location->country(),
                SESSION_LIFETIME,
            ]
        );
        Cookie::set(
            self::COOKIE,
            $token,
            time() + SESSION_LIFETIME
        );
    }
    public static function destroy(): void
    {
        $token = self::token();
        if ($token === null) {
            return;
        }
        Query::execute(
            "UPDATE ielectro_account.account_sessions
            SET revoked_at = NOW()
            WHERE token_hash = ?
            AND revoked_at IS NULL",
            [Generate::hash($token)]
        );
        self::clearCookie();
    }
    public static function refresh(): void
    {
        $token = self::token();
        if ($token === null) {
            Response::unauthorized();
        }
        $currentHash = Generate::hash($token);
        $session = Query::fetch(
            "SELECT id
            FROM ielectro_account.account_sessions
            WHERE token_hash = ?
            AND account_id = ?
            AND revoked_at IS NULL
            AND expires_at > NOW()
            LIMIT 1",
            [
                $currentHash,
                Identity::id(),
            ]
        );
        if (!$session) {
            Response::unauthorized();
        }
        $newToken = Generate::token();
        Query::execute(
            "UPDATE ielectro_account.account_sessions
            SET token_hash = ?,
                expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND),
                last_activity = NOW()
            WHERE id = ?",
            [
                Generate::hash($newToken),
                SESSION_LIFETIME,
                (int) $session['id'],
            ]
        );
        Cookie::set(
            self::COOKIE,
            $newToken,
            time() + SESSION_LIFETIME
        );
    }
    public static function revoke(int $sessionId): bool
    {
        return Query::execute(
            "UPDATE ielectro_account.account_sessions
            SET revoked_at = NOW()
            WHERE id = ?
            AND account_id = ?
            AND revoked_at IS NULL",
            [
                $sessionId,
                Identity::id(),
            ]
        ) > 0;
    }
    public static function revokeAllFor(int $accountId, ?string $excludeToken = null): void
    {
        $sql = "
            UPDATE ielectro_account.account_sessions
            SET revoked_at = NOW()
            WHERE account_id = ?
            AND revoked_at IS NULL
        ";
        $params = [$accountId];
        if ($excludeToken !== null && $excludeToken !== '') {
            $sql .= " AND token_hash != ?";
            $params[] = Generate::hash($excludeToken);
        }
        Query::execute($sql, $params);
    }
    public static function clearCookie(): void
    {
        Cookie::delete(self::COOKIE);
    }
    public static function token(): ?string
    {
        return Cookie::get(self::COOKIE);
    }
}
