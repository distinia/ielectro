<?php
namespace Www;
use Admin\Apps;
use Nesh\Query;
use Nesh\RateLimit;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
use Nesh\Schema;
class Stats
{
    public function index(): void
    {
        Routing::method([
            'GET' => fn () => $this->show(),
        ]);
    }
    private function show(): void
    {
        Request::get();
        RateLimit::check('www:stats', 60, 60);
        Response::success([
            'uptime' => self::uptime(),
            'users' => self::users(),
            'apps' => count(Apps::catalog()),
        ]);
    }
    private static function users(): int
    {
        try {
            return (int) Query::count(
                'SELECT COUNT(*) FROM ' . Schema::ACCOUNTS . ' WHERE deletion_scheduled_at IS NULL'
            );
        } catch (\Throwable) {
            return 0;
        }
    }
    private static function uptime(): float
    {
        try {
            $row = Query::fetch(
                'SELECT COUNT(DISTINCT DATE(created_at)) AS days,
                        GREATEST(
                            1,
                            LEAST(30, DATEDIFF(CURDATE(), DATE(MIN(created_at))) + 1)
                        ) AS span
                 FROM ' . Schema::ADMIN_WWW_PAGE_VIEWS . '
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
            );
            $days = (int) ($row['days'] ?? 0);
            $span = (int) ($row['span'] ?? 1);
            if ($days === 0) {
                return 100.0;
            }
            return round(100 * $days / max(1, $span), 1);
        } catch (\Throwable) {
            return 100.0;
        }
    }
}
