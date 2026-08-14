<?php
namespace Dyscover;
use Nesh\Avatar as AccountAvatar;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
class Avatar
{
    public function index(): void
    {
        Routing::method([
            'POST'   => fn() => $this->deprecated(),
            'PUT'    => fn() => $this->deprecated(),
            'PATCH'  => fn() => $this->deprecated(),
            'DELETE' => fn() => $this->deprecated(),
        ]);
    }
    private function deprecated(): void
    {
        Request::post();
        Response::badRequest(
            'Avatar uploads are managed from iElectro Account. Use https://account.ielectro.com/profile'
        );
    }
    public static function url(int $userId): string
    {
        $accountId = self::accountId($userId);
        return $accountId > 0
            ? AccountAvatar::url($accountId)
            : AccountAvatar::defaultUrl();
    }
    public static function urlForAccount(int $accountId): string
    {
        return AccountAvatar::url($accountId);
    }
    public static function provision(int $userId): void
    {
        $accountId = self::accountId($userId);
        if ($accountId > 0) {
            AccountAvatar::provision($accountId);
        }
    }
    public static function provisionForAccount(int $accountId): void
    {
        AccountAvatar::provision($accountId);
    }
    private static function accountId(int $userId): int
    {
        if ($userId <= 0) {
            return 0;
        }
        static $cache = [];
        if (array_key_exists($userId, $cache)) {
            return $cache[$userId];
        }
        $row = Query::fetch(
            'SELECT account_id FROM ielectro_dyscover.dyscover_users WHERE id = ? LIMIT 1',
            [$userId]
        );
        $cache[$userId] = $row ? (int) $row['account_id'] : 0;
        return $cache[$userId];
    }
}
