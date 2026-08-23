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
        Response::success(['services' => $services]);
    }
    public static function create(int $accountId): void
    {
        \Nesh\Avatar::provision($accountId);
        Dyscover::create($accountId);
    }
    public static function delete(int $accountId): void
    {
        Dyscover::delete($accountId);
    }
}
class Dyscover
{
    public static function create(int $accountId): void
    {
        Query::execute(
            "INSERT INTO ielectro_dyscover.dyscover_users (account_id)
            VALUES (?)",
            [$accountId]
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
            'account_id' => $accountId,
            'username' => $username,
            'biography' => (string) ($row['biography'] ?? ''),
            'website' => (string) ($row['website'] ?? ''),
            'role' => $row['role'],
            'status' => $row['status'],
            'avatar' => \Nesh\Avatar::url($accountId),
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
    public static function rewriteMentionUsername(
        string $oldUsername,
        string $newUsername
    ): void {
        if (!class_exists(\Dyscover\PostMentions::class, true)) {
            return;
        }
        \Dyscover\PostMentions::rewriteUsername($oldUsername, $newUsername);
    }
}