<?php
namespace Admin;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Schema;
require_once __DIR__ . '/access.php';
class Analytics
{
    public function index(): void
    {
        Request::get();
        Access::requireMember();
        $month = self::resolveMonth((string) Request::value('month', ''));
        Response::success([
            'overview' => self::overview(),
            'content' => self::content(),
            'ecosystem' => self::ecosystem(),
            'trends' => self::trends(),
            'views_series' => self::wwwViewsSeries($month),
            'available_months' => self::availableMonths(18),
            'signups' => self::signupsSeries(14),
            'top_contributors' => self::topContributors(8),
            'recent_accounts' => self::recentAccounts(6),
            'recent_dyscover' => self::recentDyscoverActivity(8),
        ]);
    }
    private static function overview(): array
    {
        $accounts = Schema::ACCOUNTS;
        $sessions = Schema::ACCOUNT_SESSIONS;
        return [
            'total_accounts' => (int) Query::count(
                "SELECT COUNT(*) FROM {$accounts} WHERE deletion_scheduled_at IS NULL"
            ),
            'new_accounts_7d' => (int) Query::count(
                "SELECT COUNT(*) FROM {$accounts}
                WHERE deletion_scheduled_at IS NULL
                AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
            ),
            'new_accounts_30d' => (int) Query::count(
                "SELECT COUNT(*) FROM {$accounts}
                WHERE deletion_scheduled_at IS NULL
                AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
            ),
            'verified_accounts' => (int) Query::count(
                "SELECT COUNT(*) FROM {$accounts}
                WHERE deletion_scheduled_at IS NULL
                AND email_verified_at IS NOT NULL"
            ),
            'active_sessions' => (int) Query::count(
                "SELECT COUNT(*) FROM {$sessions}
                WHERE revoked_at IS NULL
                AND expires_at > NOW()"
            ),
            'online_recent' => self::onlineRecent(),
        ];
    }
    private static function onlineRecent(): int
    {
        $sessions = Schema::ACCOUNT_SESSIONS;
        return (int) Query::count(
            "SELECT COUNT(*) FROM {$sessions}
            WHERE revoked_at IS NULL
            AND expires_at > NOW()
            AND last_activity >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)"
        );
    }
    private static function content(): array
    {
        return [
            'news' => (int) Query::count('SELECT COUNT(*) FROM ' . Schema::ADMIN_NEWS),
            'news_published' => (int) Query::count(
                "SELECT COUNT(*) FROM " . Schema::ADMIN_NEWS . " WHERE status = 'published'"
            ),
            'team' => (int) Query::count('SELECT COUNT(*) FROM ' . Schema::ADMIN_TEAM),
            'careers' => (int) Query::count('SELECT COUNT(*) FROM ' . Schema::ADMIN_CAREERS),
            'careers_active' => (int) Query::count(
                "SELECT COUNT(*) FROM " . Schema::ADMIN_CAREERS . " WHERE status = 'active'"
            ),
            'applications' => (int) Query::count(
                'SELECT COUNT(*) FROM ' . Schema::ADMIN_CAREER_APPLICATIONS
            ),
        ];
    }
    private static function ecosystem(): array
    {
        $data = [
            'dyscover_users' => 0,
            'dyscover_posts' => 0,
            'dyscover_views_7d' => 0,
            'dyscover_engagement_7d' => 0,
            'dyscover_posts_7d' => 0,
            'dyscover_viewers_7d' => 0,
        ];
        try {
            $data['dyscover_users'] = (int) Query::count(
                'SELECT COUNT(*) FROM ' . Schema::DYSCOVER_USERS . " WHERE status = 'active'"
            );
            $data['dyscover_posts'] = (int) Query::count(
                "SELECT COUNT(*) FROM " . Schema::DYSCOVER_POSTS . " WHERE status = 'active'"
            );
            $data['dyscover_views_7d'] = (int) Query::count(
                'SELECT COUNT(*) FROM ' . Schema::DYSCOVER_POST_VIEWS . '
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
            );
            $data['dyscover_engagement_7d'] = (int) Query::count(
                'SELECT COUNT(*) FROM ' . Schema::DYSCOVER_ACTIVITY . '
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
            );
            $data['dyscover_posts_7d'] = (int) Query::count(
                "SELECT COUNT(*) FROM " . Schema::DYSCOVER_POSTS . "
                WHERE status = 'active'
                AND published_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
            );
            $data['dyscover_viewers_7d'] = (int) Query::count(
                'SELECT COUNT(DISTINCT user_id) FROM ' . Schema::DYSCOVER_POST_VIEWS . '
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                AND user_id IS NOT NULL'
            );
        } catch (\Throwable) {
        }
        return $data;
    }
    private static function trends(): array
    {
        return [
            'week' => [
                'visitors' => self::percentDelta(
                    self::wwwViewCount(7, 0),
                    self::wwwViewCount(7, 7)
                ),
                'views' => self::percentDelta(
                    self::wwwViewCount(7, 0),
                    self::wwwViewCount(7, 7)
                ),
            ],
            'month' => [
                'visitors' => self::percentDelta(
                    self::wwwViewCount(30, 0),
                    self::wwwViewCount(30, 30)
                ),
                'views' => self::percentDelta(
                    self::wwwViewCount(30, 0),
                    self::wwwViewCount(30, 30)
                ),
            ],
        ];
    }
    private static function wwwViewCount(int $days, int $offsetDays): int
    {
        try {
            return (int) Query::count(
                'SELECT COUNT(*) FROM ' . Schema::ADMIN_WWW_PAGE_VIEWS . '
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [$days + $offsetDays, $offsetDays]
            );
        } catch (\Throwable) {
            return 0;
        }
    }
    private static function resolveMonth(string $month): string
    {
        $month = trim($month);
        if ($month !== '' && preg_match('/^\d{4}-\d{2}$/', $month)) {
            return $month;
        }
        return date('Y-m');
    }
    private static function availableMonths(int $limit): array
    {
        $months = [];
        $cursor = new \DateTimeImmutable('first day of this month');
        for ($i = 0; $i < $limit; $i++) {
            $months[] = [
                'value' => $cursor->format('Y-m'),
                'label' => $cursor->format('F Y'),
            ];
            $cursor = $cursor->modify('-1 month');
        }
        return $months;
    }
    private static function wwwViewsSeries(string $month): array
    {
        try {
            $start = date('Y-m-01', strtotime($month . '-01'));
            $daysInMonth = (int) date('t', strtotime($start));
            $end = date('Y-m-d', strtotime($start . ' +' . ($daysInMonth - 1) . ' days'));
            $rows = Query::fetchAll(
                'SELECT DATE(created_at) AS day, COUNT(*) AS count
                FROM ' . Schema::ADMIN_WWW_PAGE_VIEWS . '
                WHERE created_at >= ?
                AND created_at < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY DATE(created_at)
                ORDER BY day ASC',
                [$start, $end]
            );
            $series = self::fillSeriesForRange($rows, $start, $daysInMonth);
            $total = array_sum(array_column($series, 'count'));
            return [
                'month' => date('Y-m', strtotime($start)),
                'month_label' => date('F Y', strtotime($start)),
                'views' => $series,
                'total' => $total,
            ];
        } catch (\Throwable) {
            $start = date('Y-m-01');
            $daysInMonth = (int) date('t');
            return [
                'month' => date('Y-m'),
                'month_label' => date('F Y'),
                'views' => self::fillSeriesForRange([], $start, $daysInMonth),
                'total' => 0,
            ];
        }
    }
    private static function fillSeriesForRange(array $rows, string $startDate, int $days): array
    {
        $map = [];
        foreach ($rows as $row) {
            $map[(string) $row['day']] = (int) $row['count'];
        }
        $series = [];
        for ($i = 0; $i < $days; $i++) {
            $day = date('Y-m-d', strtotime($startDate . " +{$i} days"));
            $series[] = [
                'day' => $day,
                'label' => date('d/m', strtotime($day)),
                'count' => $map[$day] ?? 0,
            ];
        }
        return $series;
    }
    private static function viewerCount(int $days, int $offsetDays): int
    {
        try {
            return (int) Query::count(
                'SELECT COUNT(DISTINCT user_id) FROM ' . Schema::DYSCOVER_POST_VIEWS . '
                WHERE user_id IS NOT NULL
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [$days + $offsetDays, $offsetDays]
            );
        } catch (\Throwable) {
            return 0;
        }
    }
    private static function viewCount(int $days, int $offsetDays): int
    {
        try {
            return (int) Query::count(
                'SELECT COUNT(*) FROM ' . Schema::DYSCOVER_POST_VIEWS . '
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [$days + $offsetDays, $offsetDays]
            );
        } catch (\Throwable) {
            return 0;
        }
    }
    private static function percentDelta(int $current, int $previous): ?float
    {
        if ($previous <= 0) {
            return $current > 0 ? 100.0 : 0.0;
        }
        return round((($current - $previous) / $previous) * 100, 2);
    }
    private static function signupsSeries(int $days): array
    {
        $accounts = Schema::ACCOUNTS;
        $rows = Query::fetchAll(
            "SELECT DATE(created_at) AS day, COUNT(*) AS count
            FROM {$accounts}
            WHERE deletion_scheduled_at IS NULL
            AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY day ASC",
            [$days - 1]
        );
        return self::fillSeries($rows, $days);
    }
    private static function viewsSeries(int $days): array
    {
        try {
            $views = Schema::DYSCOVER_POST_VIEWS;
            $rows = Query::fetchAll(
                "SELECT DATE(created_at) AS day, COUNT(*) AS count
                FROM {$views}
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                GROUP BY DATE(created_at)
                ORDER BY day ASC",
                [$days - 1]
            );
            $visitorRows = Query::fetchAll(
                "SELECT DATE(created_at) AS day, COUNT(DISTINCT user_id) AS count
                FROM {$views}
                WHERE user_id IS NOT NULL
                AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                GROUP BY DATE(created_at)
                ORDER BY day ASC",
                [$days - 1]
            );
            return [
                'views' => self::fillSeries($rows, $days),
                'visitors' => self::fillSeries($visitorRows, $days),
            ];
        } catch (\Throwable) {
            return [
                'views' => self::fillSeries([], $days),
                'visitors' => self::fillSeries([], $days),
            ];
        }
    }
    private static function fillSeries(array $rows, int $days): array
    {
        $map = [];
        foreach ($rows as $row) {
            $map[(string) $row['day']] = (int) $row['count'];
        }
        $series = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $day = date('Y-m-d', strtotime("-{$i} days"));
            $series[] = [
                'day' => $day,
                'label' => date('d/m', strtotime($day)),
                'count' => $map[$day] ?? 0,
            ];
        }
        return $series;
    }
    private static function topContributors(int $limit): array
    {
        $accounts = Schema::ACCOUNTS;
        try {
            $rows = Query::fetchAll(
                'SELECT
                    du.id AS dyscover_user_id,
                    a.id,
                    a.username,
                    a.email,
                    a.name,
                    a.surname,
                    (
                        SELECT COUNT(*) FROM ' . Schema::DYSCOVER_POSTS . ' p
                        WHERE p.user_id = du.id
                        AND p.status = ?
                        AND p.published_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    ) AS posts_30d,
                    (
                        SELECT COUNT(*) FROM ' . Schema::DYSCOVER_POST_COMMENTS . ' c
                        WHERE c.user_id = du.id
                        AND c.status = ?
                        AND c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    ) AS comments_30d,
                    (
                        SELECT COUNT(*) FROM ' . Schema::DYSCOVER_POST_LIKES . ' l
                        WHERE l.user_id = du.id
                        AND l.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    ) AS likes_30d
                FROM ' . Schema::DYSCOVER_USERS . ' du
                INNER JOIN ' . $accounts . ' a ON a.id = du.account_id
                WHERE du.status = ?
                AND a.deletion_scheduled_at IS NULL
                HAVING (posts_30d + comments_30d + likes_30d) > 0
                ORDER BY (posts_30d * 5 + comments_30d * 3 + likes_30d) DESC
                LIMIT ?',
                ['active', 'active', 'active', $limit]
            );
        } catch (\Throwable) {
            return [];
        }
        return array_map(
            static fn(array $row): array => self::accountRow($row, [
                'posts_30d' => (int) $row['posts_30d'],
                'comments_30d' => (int) $row['comments_30d'],
                'likes_30d' => (int) $row['likes_30d'],
                'score' => (int) $row['posts_30d'] * 5
                    + (int) $row['comments_30d'] * 3
                    + (int) $row['likes_30d'],
            ]),
            $rows
        );
    }
    private static function recentAccounts(int $limit): array
    {
        $accounts = Schema::ACCOUNTS;
        $rows = Query::fetchAll(
            "SELECT id, username, email, name, surname, created_at, email_verified_at
            FROM {$accounts}
            WHERE deletion_scheduled_at IS NULL
            ORDER BY created_at DESC
            LIMIT ?",
            [$limit]
        );
        return array_map(
            static fn(array $row): array => self::accountRow($row, [
                'created_at' => $row['created_at'],
                'verified' => $row['email_verified_at'] !== null,
            ]),
            $rows
        );
    }
    private static function recentDyscoverActivity(int $limit): array
    {
        try {
            $rows = Query::fetchAll(
                'SELECT
                    da.type,
                    da.message,
                    da.created_at,
                    actor_acc.username AS actor_username,
                    recip_acc.username AS recipient_username,
                    p.title AS post_title
                FROM ' . Schema::DYSCOVER_ACTIVITY . ' da
                INNER JOIN ' . Schema::DYSCOVER_USERS . ' actor ON actor.id = da.actor_id
                INNER JOIN ' . Schema::ACCOUNTS . ' actor_acc ON actor_acc.id = actor.account_id
                INNER JOIN ' . Schema::DYSCOVER_USERS . ' recip ON recip.id = da.recipient_id
                INNER JOIN ' . Schema::ACCOUNTS . ' recip_acc ON recip_acc.id = recip.account_id
                LEFT JOIN ' . Schema::DYSCOVER_POSTS . ' p ON p.id = da.post_id
                ORDER BY da.id DESC
                LIMIT ?',
                [$limit]
            );
        } catch (\Throwable) {
            return [];
        }
        return array_map(
            static fn(array $row): array => [
                'type' => $row['type'],
                'message' => $row['message'],
                'created_at' => $row['created_at'],
                'actor_username' => $row['actor_username'],
                'recipient_username' => $row['recipient_username'],
                'post_title' => $row['post_title'],
            ],
            $rows
        );
    }
    private static function accountRow(array $row, array $extra): array
    {
        $name = trim(((string) ($row['name'] ?? '')) . ' ' . ((string) ($row['surname'] ?? '')));
        return array_merge([
            'id' => (int) $row['id'],
            'username' => (string) ($row['username'] ?? ''),
            'email' => (string) ($row['email'] ?? ''),
            'display_name' => $name !== '' ? $name : (string) ($row['username'] ?? ''),
            'initials' => self::initials($name !== '' ? $name : (string) ($row['username'] ?? '?')),
            'avatar' => \Nesh\Avatar::url((int) $row['id']),
        ], $extra);
    }
    private static function initials(string $value): string
    {
        $parts = preg_split('/\s+/', trim($value)) ?: [];
        $letters = '';
        foreach ($parts as $part) {
            if ($part === '') {
                continue;
            }
            $letters .= mb_strtoupper(mb_substr($part, 0, 1));
            if (mb_strlen($letters) >= 2) {
                break;
            }
        }
        return $letters !== '' ? $letters : '?';
    }
}
