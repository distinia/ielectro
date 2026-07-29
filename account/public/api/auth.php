<?php
namespace Account;
use Nesh\Identifier;
use Nesh\Response;
use Nesh\Geolocation;
use Nesh\Request;
use Nesh\Session;
use Nesh\Cookie;
use Nesh\Query;
use Nesh\RateLimit;
use Nesh\Validate;
use Nesh\Password;
class AuthSession
{
    private const COOKIE = 'session_token';
    public static function create(int $accountId): void
    {
        $token = Identifier::token();
        $tokenHash = Identifier::hash($token);
        $location = new Geolocation(Request::ip());
        Query::execute(
            "INSERT INTO account_sessions(
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
                SESSION_LIFETIME
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
        if (!$token) {
            return;
        }
        Query::execute(
            "DELETE FROM account_sessions WHERE token_hash = ?",
            [Identifier::hash($token)]
        );
        Cookie::delete(self::COOKIE);
    }
    public static function refresh(): void
    {
        $token = self::token();
        if (!$token) {
            return;
        }
        $newToken = Identifier::token();
        $newTokenHash = Identifier::hash($newToken);
        Query::execute(
            "UPDATE account_sessions SET token_hash = ?, expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE token_hash = ?",
            [
                $newTokenHash,
                SESSION_LIFETIME,
                Identifier::hash($token)
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
            "DELETE FROM account_sessions
            WHERE id = ? AND account_id = ?",
            [
                $sessionId,
                Session::userId()
            ]
        ) > 0;
    }
    public static function revokeAll(): void
    {
        Query::execute(
            "DELETE FROM account_sessions WHERE account_id = ?",
            [Session::userId()]
        );
        Cookie::delete(self::COOKIE);
    }
    public static function current(): ?array
    {
        $token = self::token();
        if (!$token) {
            return null;
        }
        return Query::fetch(
            "SELECT * FROM account_sessions WHERE token_hash = ? LIMIT 1",
            [Identifier::hash($token)]
        );
    }
    public static function token(): ?string
    {
        return Cookie::get(self::COOKIE);
    }
}
class Auth
{
    public function login(): void
    {
        Request::post();
        RateLimit::check('login', 30, 900);
        $input = Request::input();
        $identifier = trim((string) ($input['identifier'] ?? ''));
        $password = (string) ($input['password'] ?? '');
        if (!Validate::required($identifier) || !Validate::required($password)) {
            Response::badRequest('Username or email and password are required');
        }
        $account = Query::fetch(
            "SELECT id, password_hash
            FROM accounts
            WHERE (username = ? OR email = ?)
            LIMIT 1",
            [$identifier, $identifier]
        );
        if (!$account || !Password::verify($password, $account['password_hash'])) {
            Response::unauthorized('Invalid username, email or password');
        }
        AuthSession::create((int) $account['id']);
        Response::success('Signed in successfully');
    }
    public function logout(): void
    {
        Request::post();
        AuthSession::destroy();
        Response::success('Signed out successfully');
    }
    public function refresh(): void
    {
        Request::post();
        AuthSession::refresh();
        Response::success();
    }
}