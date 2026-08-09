<?php
namespace Account;
use Nesh\App;
use Nesh\File;
use Nesh\Identity;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Schema;
class Services
{
    public function index(): void
    {
        Request::get();
        $accountId = Identity::id();
        $services = [];
        $dyscoverApp = App::get('dyscover');
        if ($dyscoverApp) {
            $profile = Dyscover::profile($accountId);
            $services[] = [
                'id' => 'dyscover',
                'name' => $dyscoverApp->name,
                'url' => $dyscoverApp->url,
                'linked' => $profile !== null,
                'profile' => $profile,
            ];
        }
        $dominionsApp = App::get('dominions');
        if ($dominionsApp) {
            $profile = Dominions::profile($accountId);
            $services[] = [
                'id' => 'dominions',
                'name' => $dominionsApp->name,
                'url' => $dominionsApp->url,
                'linked' => $profile !== null,
                'profile' => $profile,
            ];
        }
        Response::success(['services' => $services]);
    }
    public static function create(int $accountId): void
    {
        Dyscover::create($accountId);
        Dominions::create($accountId);
    }
    public static function delete(int $accountId): void
    {
        Dyscover::delete($accountId);
        Dominions::delete($accountId);
    }
}
class Dyscover
{
    private const AVATAR = 'avatar.png';
    public static function create(int $accountId): void
    {
        Query::execute(
            "INSERT INTO ielectro_dyscover.dyscover_users (account_id)
            VALUES (?)",
            [$accountId]
        );
        $userId = (int) Query::lastId();
        File::copyDirectory(
            ROOT_PATH . '/dyscover/assets/default-user',
            ROOT_PATH . '/dyscover/assets/users/' . $userId
        );
    }
    public static function delete(int $accountId): void
    {
        $row = Query::fetch(
            'SELECT id
            FROM ielectro_dyscover.dyscover_users
            WHERE account_id = ?
            LIMIT 1',
            [$accountId]
        );
        $userId = $row ? (int) $row['id'] : 0;
        Query::execute(
            "DELETE
            FROM ielectro_dyscover.dyscover_users
            WHERE account_id = ?",
            [$accountId]
        );
        if ($userId <= 0) {
            return;
        }
        File::deleteDirectory(
            ROOT_PATH . '/dyscover/assets/users/' . $userId
        );
    }
    public static function profile(int $accountId): ?array
    {
        $row = Query::fetch(
            'SELECT
                du.id,
                du.biography,
                du.website,
                du.role,
                du.status,
                du.created_at,
                a.username
            FROM ' . Schema::DYSCOVER_USERS . ' du
            INNER JOIN ' . Schema::ACCOUNTS . ' a ON a.id = du.account_id
            WHERE du.account_id = ?
            LIMIT 1',
            [$accountId]
        );
        if (!$row) {
            return null;
        }
        $userId = (int) $row['id'];
        $username = (string) ($row['username'] ?? '');
        $app = App::get('dyscover');
        $baseUrl = $app ? $app->url : 'https://dyscover.ielectro.com';
        return [
            'id' => $userId,
            'username' => $username,
            'biography' => (string) ($row['biography'] ?? ''),
            'website' => (string) ($row['website'] ?? ''),
            'role' => $row['role'],
            'status' => $row['status'],
            'avatar' => $baseUrl . '/assets/users/' . $userId . '/' . self::AVATAR,
            'followers' => Query::count(
                'SELECT COUNT(*) FROM ' . Schema::DYSCOVER_FOLLOWS . ' WHERE followed_id = ?',
                [$userId]
            ),
            'following' => Query::count(
                'SELECT COUNT(*) FROM ' . Schema::DYSCOVER_FOLLOWS . ' WHERE follower_id = ?',
                [$userId]
            ),
            'posts' => Query::count(
                "SELECT COUNT(*) FROM " . Schema::DYSCOVER_POSTS . " WHERE user_id = ? AND status = 'active'",
                [$userId]
            ),
            'created_at' => $row['created_at'],
            'profile_url' => $username !== ''
                ? $baseUrl . '/users/' . rawurlencode($username)
                : $baseUrl,
        ];
    }
}
class Dominions
{
    public static function create(int $accountId): void
    {
        Query::execute(
            'INSERT INTO ' . Schema::DOMINIONS_USERS . ' (account_id)
            VALUES (?)',
            [$accountId]
        );
    }
    public static function delete(int $accountId): void
    {
        Query::execute(
            'DELETE
            FROM ' . Schema::DOMINIONS_USERS . '
            WHERE account_id = ?',
            [$accountId]
        );
    }
    public static function profile(int $accountId): ?array
    {
        $row = Query::fetch(
            'SELECT id, created_at
            FROM ' . Schema::DOMINIONS_USERS . '
            WHERE account_id = ?
            LIMIT 1',
            [$accountId]
        );
        if (!$row) {
            return null;
        }
        $app = App::get('dominions');
        $baseUrl = $app ? $app->url : 'https://dominions.ielectro.com';
        return [
            'id' => (int) $row['id'],
            'created_at' => $row['created_at'],
            'profile_url' => $baseUrl,
        ];
    }
}
