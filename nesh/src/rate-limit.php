<?php
namespace Nesh;
class RateLimit
{
    public static function check(
        string $scope,
        int $maxAttempts,
        int $windowSeconds,
        ?string $identifier = null
    ): void {
        $scope = trim($scope);
        if ($scope === '') {
            Response::error('Invalid rate limit scope');
        }
        $key = Request::ip();
        if ($identifier !== null) {
            $identifier = Strings::normalize($identifier);
            if ($identifier !== null) {
                $key = Identifier::hash($identifier);
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
            $key
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
            ", [
                $scope,
                $key,
                $windowSeconds
            ]);
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
                (int) $row['id']
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
}