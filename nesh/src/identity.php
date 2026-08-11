<?php
namespace Nesh;

class Identity
{
    private static ?array $identity = null;

    public static function data(): ?array
    {
        if (self::$identity !== null) {
            return self::$identity;
        }

        $token = Cookie::get('session_token');
        if ($token === null) {
            return null;
        }

        $identity = Query::fetch(
            'SELECT
                s.id AS session_id,
                s.account_id,
                a.username
            FROM ' . Schema::ACCOUNT_SESSIONS . ' s
            INNER JOIN ' . Schema::ACCOUNTS . ' a
                ON a.id = s.account_id
            WHERE s.token_hash = ?
            AND s.revoked_at IS NULL
            AND s.expires_at > NOW()
            LIMIT 1',
            [Generate::hash($token)]
        );

        if (!$identity) {
            Cookie::delete('session_token');
            return null;
        }

        Query::execute(
            'UPDATE ' . Schema::ACCOUNT_SESSIONS . '
            SET last_activity = NOW(),
                expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND)
            WHERE id = ?',
            [SESSION_LIFETIME, $identity['session_id']]
        );

        Cookie::set(
            'session_token',
            $token,
            time() + SESSION_LIFETIME
        );

        self::$identity = $identity;
        return self::$identity;
    }

    public static function id(): ?int
    {
        return self::data()['account_id'] ?? null;
    }

    public static function sessionId(): ?int
    {
        return self::data()['session_id'] ?? null;
    }

    public static function username(): ?string
    {
        return self::data()['username'] ?? null;
    }

    public static function required(): void
    {
        if (self::data() === null) {
            Response::unauthorized();
        }
    }
}
