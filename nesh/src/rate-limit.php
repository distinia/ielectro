<?php
namespace Nesh;
class RateLimit
{
    private const KEY_MAX_LENGTH = 45;
    public static function check(
        string $scope,
        int $maxAttempts,
        int $windowSeconds,
        ?string $identifier = null
    ): void {
        $GLOBALS['admin']->database->use();
        $scope = trim($scope);
        if ($scope === '') {
            Response::error('Invalid rate limit scope');
        }
        $key = self::ipKey();
        if ($identifier !== null) {
            $identifier = Strings::normalize($identifier);
            if ($identifier !== null) {
                $scope .= ':account';
                $key = self::accountKey($identifier);
            }
        }
        $row = Query::fetch("
            SELECT
                id,
                attempts,
                window_start
            FROM rate_limits
            WHERE scope_key = ?
            AND ip_address = ?
            LIMIT 1
        ", [
            $scope,
            $key,
        ]);
        if (!$row) {
            Query::execute("
                INSERT INTO rate_limits(
                    scope_key,
                    ip_address,
                    attempts,
                    window_start,
                    expires_at
                )
                VALUES(
                    ?,
                    ?,
                    1,
                    NOW(),
                    DATE_ADD(NOW(), INTERVAL ? SECOND)
                )
                ON DUPLICATE KEY UPDATE
                    attempts = IF(
                        TIMESTAMPDIFF(SECOND, window_start, NOW()) > ?,
                        1,
                        attempts + 1
                    ),
                    window_start = IF(
                        TIMESTAMPDIFF(SECOND, window_start, NOW()) > ?,
                        NOW(),
                        window_start
                    ),
                    expires_at = IF(
                        TIMESTAMPDIFF(SECOND, window_start, NOW()) > ?,
                        DATE_ADD(NOW(), INTERVAL ? SECOND),
                        expires_at
                    )
            ", [
                $scope,
                $key,
                $windowSeconds,
                $windowSeconds,
                $windowSeconds,
                $windowSeconds,
                $windowSeconds,
            ]);
            $row = Query::fetch("
                SELECT attempts, window_start
                FROM rate_limits
                WHERE scope_key = ?
                AND ip_address = ?
                LIMIT 1
            ", [
                $scope,
                $key,
            ]);
            if ($row && (int) $row['attempts'] >= $maxAttempts) {
                Response::tooManyRequests();
            }
            return;
        }
        $windowStart = strtotime($row['window_start']);
        if ($windowStart === false || time() - $windowStart > $windowSeconds) {
            Query::execute("
                UPDATE rate_limits
                SET
                    attempts = 1,
                    window_start = NOW(),
                    expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND)
                WHERE id = ?
            ", [
                $windowSeconds,
                (int) $row['id'],
            ]);
            return;
        }
        if ((int) $row['attempts'] >= $maxAttempts) {
            Response::tooManyRequests();
        }
        Query::execute("
            UPDATE rate_limits
            SET attempts = attempts + 1
            WHERE id = ?
        ", [(int) $row['id']]);
    }
    private static function ipKey(): string
    {
        return substr(trim(Request::ip()), 0, self::KEY_MAX_LENGTH);
    }
    private static function accountKey(string $identifier): string
    {
        return substr(
            'a:' . Generate::hash($identifier),
            0,
            self::KEY_MAX_LENGTH
        );
    }
}
