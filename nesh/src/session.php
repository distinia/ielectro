<?php
namespace Nesh;
class Session
{
    private static ?array $account = null;
    public static function account(): ?array
    {
        if (self::$account !== null) {
            return self::$account;
        }
        $token = Cookie::get('session_token');
        if ($token === null) {
            return null;
        }
        $account = Query::fetch("
            SELECT
                s.id AS session_id,
                s.last_activity,
                s.expires_at,
                a.id,
                a.username,
                a.name,
                a.surname,
                a.email,
                a.phone_number,
                a.email_verified_at
            FROM account_sessions s
            INNER JOIN accounts a
                ON a.id = s.account_id
            WHERE s.token_hash = ?
            AND s.revoked_at IS NULL
            AND s.expires_at > NOW()
            LIMIT 1
        ", [
            Identifier::hash($token)
        ]);
        if (!$account) {
            Cookie::delete('session_token');
            return null;
        }
        Query::execute("
            UPDATE account_sessions
            SET last_activity = NOW()
            WHERE id = ?
        ", [
            $account['session_id']
        ]);
        self::$account = $account;
        return self::$account;
    }
    public static function userId(): ?int
    {
        return self::account()['id'] ?? null;
    }
    public static function username(): ?string
    {
        return self::account()['username'] ?? null;
    }
    public static function email(): ?string
    {
        return self::account()['email'] ?? null;
    }
    public static function sessionId(): ?int
    {
        return self::account()['session_id'] ?? null;
    }
    public static function exists(): bool
    {
        return self::account() !== null;
    }
    public static function required(): void
    {
        if (!self::exists()) {
            Response::unauthorized();
        }
    }
}