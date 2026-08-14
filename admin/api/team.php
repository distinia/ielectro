<?php
namespace Admin;
use Nesh\Generate;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
use Nesh\Schema;
use Nesh\Validate;
require_once __DIR__ . '/access.php';
require_once __DIR__ . '/paths.php';
class Team
{
    private Create $create;
    private Data $data;
    private Update $update;
    private Delete $delete;
    public function __construct()
    {
        $this->create = new Create();
        $this->data = new Data();
        $this->update = new Update();
        $this->delete = new Delete();
    }
    public function index(): void
    {
        Routing::method([
            'GET'    => fn() => Routing::id()
                ? $this->data->one()
                : $this->data->list(),
            'POST'   => fn() => Routing::id()
                ? $this->update->index()
                : $this->create->index(),
            'PATCH'  => fn() => $this->update->index(),
            'DELETE' => fn() => $this->delete->index(),
        ]);
    }
}
class Create
{
    public function index(): void
    {
        Request::post();
        Access::requireMember();
        $member = TeamFields::validate(Request::body());
        $uuid = Generate::uuid();
        Query::execute(
            "INSERT INTO ielectro_admin.team(
                uuid,
                account_id,
                role_text,
                linkedin,
                github,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?)",
            [
                $uuid,
                $member['account_id'],
                $member['role_text'],
                $member['linkedin'] !== '' ? $member['linkedin'] : null,
                $member['github'] !== '' ? $member['github'] : null,
                $member['status'],
            ]
        );
        Response::created(['id' => Query::lastId()]);
    }
}
class Data
{
    private static function selectSql(): string
    {
        return "SELECT
                t.id,
                t.account_id,
                t.role_text,
                t.linkedin,
                t.github,
                t.status,
                t.created_at,
                t.updated_at,
                a.username AS account_username,
                a.email AS account_email,
                a.name AS account_first_name,
                a.surname AS account_last_name,
                TRIM(CONCAT(COALESCE(a.name, ''), ' ', COALESCE(a.surname, ''))) AS account_name
            FROM ielectro_admin.team t
            LEFT JOIN " . Schema::ACCOUNTS . " a ON a.id = t.account_id";
    }
    public function list(): void
    {
        Request::get();
        $rows = Query::fetchAll(
            self::selectSql() . "
            ORDER BY t.id DESC"
        );
        Response::success(TeamFields::rows($rows));
    }
    public function one(): void
    {
        Request::get();
        $id = TeamFields::id();
        $row = Query::fetch(
            self::selectSql() . "
            WHERE t.id = ?
            LIMIT 1",
            [$id]
        );
        if (!$row) {
            Response::notFound('Team member not found');
        }
        Response::success(TeamFields::row($row, true));
    }
}
class Update
{
    public function index(): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
            Request::post();
        } else {
            Request::patch();
        }
        Access::requireMember();
        $id = TeamFields::id();
        $row = Query::fetch(
            "SELECT id FROM ielectro_admin.team WHERE id = ? LIMIT 1",
            [$id]
        );
        if (!$row) {
            Response::notFound('Team member not found');
        }
        $input = Request::body();
        if (!$input) {
            Response::badRequest('No data provided');
        }
        $fields = [];
        $params = [];
        if (array_key_exists('role_text', $input) || array_key_exists('body', $input)) {
            $role = trim((string) ($input['role_text'] ?? $input['body'] ?? ''));
            if (!Validate::required($role)) {
                Response::badRequest('Role is required');
            }
            $fields[] = 'role_text = ?';
            $params[] = $role;
        }
        if (array_key_exists('account_id', $input)) {
            $accountId = TeamFields::accountId($input['account_id'] ?? null);
            if ($accountId === null) {
                Response::badRequest('Account is required');
            }
            $fields[] = 'account_id = ?';
            $params[] = $accountId;
        }
        if (array_key_exists('status', $input)) {
            $fields[] = 'status = ?';
            $params[] = TeamFields::status($input['status']);
        }
        foreach (['linkedin', 'github'] as $field) {
            if (!array_key_exists($field, $input)) {
                continue;
            }
            $value = TeamFields::socialUsername($input[$field], $field, true);
            $fields[] = "{$field} = ?";
            $params[] = $value !== '' ? $value : null;
        }
        if (!$fields) {
            Response::success('Nothing changed');
        }
        $params[] = $id;
        Query::execute(
            "UPDATE ielectro_admin.team
            SET " . implode(', ', $fields) . "
            WHERE id = ?",
            $params
        );
        Response::success('Team member updated');
    }
}
class Delete
{
    public function index(): void
    {
        Request::delete();
        Access::requireMember();
        $id = TeamFields::id();
        $row = Query::fetch(
            "SELECT id FROM ielectro_admin.team WHERE id = ? LIMIT 1",
            [$id]
        );
        if (!$row) {
            Response::notFound('Team member not found');
        }
        Query::execute("DELETE FROM ielectro_admin.team WHERE id = ?", [$id]);
        Response::success('Team member deleted');
    }
}
class TeamFields
{
    public static function id(): int
    {
        $id = Routing::id();
        if ($id === null || $id <= 0) {
            Response::badRequest('Invalid id');
        }
        return $id;
    }
    public static function accountId(mixed $value): ?int
    {
        $id = (int) $value;
        return $id > 0 ? $id : null;
    }
    public static function status(mixed $value): string
    {
        $value = strtolower(trim((string) $value));
        if (in_array($value, ['active', 'hidden'], true)) {
            return $value;
        }
        if (in_array($value, ['1', 'true'], true)) {
            return 'active';
        }
        if (in_array($value, ['0', 'false'], true)) {
            return 'hidden';
        }
        return 'active';
    }
    public static function socialUsername(
        mixed $value,
        string $platform,
        bool $rejectInvalid = false
    ): string {
        $value = trim((string) $value);
        if ($value === '') {
            return '';
        }
        $value = ltrim($value, '@');
        if (preg_match('#^https?://#i', $value)) {
            $path = (string) (parse_url($value, PHP_URL_PATH) ?: '');
            $parts = array_values(array_filter(explode('/', trim($path, '/'))));
            if ($platform === 'linkedin') {
                $index = array_search('in', $parts, true);
                if ($index !== false && isset($parts[$index + 1])) {
                    $value = $parts[$index + 1];
                } elseif ($parts !== []) {
                    $value = (string) end($parts);
                }
            } elseif ($platform === 'github' && $parts !== []) {
                $value = (string) $parts[0];
            }
        } elseif (stripos($value, 'linkedin.com/in/') !== false) {
            if (preg_match('#linkedin\.com/in/([^/?#]+)#i', $value, $matches)) {
                $value = $matches[1];
            }
        } elseif (stripos($value, 'github.com/') !== false) {
            if (preg_match('#github\.com/([^/?#]+)#i', $value, $matches)) {
                $value = $matches[1];
            }
        }
        $value = trim($value, " \t\n\r\0\x0B/@");
        if ($value === '') {
            return '';
        }
        if (!self::isSocialUsername($value, $platform)) {
            if ($rejectInvalid) {
                Response::badRequest(
                    ucfirst($platform) . ' username is invalid'
                );
            }
            return '';
        }
        return $value;
    }
    private static function isSocialUsername(string $value, string $platform): bool
    {
        if ($platform === 'github') {
            return (bool) preg_match('/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/', $value);
        }
        return (bool) preg_match('/^[a-zA-Z0-9][a-zA-Z0-9-_.]{0,98}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/', $value);
    }
    public static function displayName(array $row): string
    {
        $name = trim((string) ($row['account_name'] ?? ''));
        if ($name !== '') {
            return $name;
        }
        $username = trim((string) ($row['account_username'] ?? ''));
        return $username !== '' ? $username : 'Unknown';
    }
    public static function validate(array $input): array
    {
        $role = trim((string) ($input['role_text'] ?? $input['body'] ?? ''));
        $accountId = self::accountId($input['account_id'] ?? null);
        if ($accountId === null) {
            Response::badRequest('Account is required');
        }
        if (!Validate::required($role)) {
            Response::badRequest('Role is required');
        }
        return [
            'role_text' => $role,
            'account_id' => $accountId,
            'linkedin' => self::socialUsername($input['linkedin'] ?? '', 'linkedin', true),
            'github' => self::socialUsername($input['github'] ?? '', 'github', true),
            'status' => self::status($input['status'] ?? 'active'),
        ];
    }
    public static function rows(array $rows): array
    {
        return array_map(
            fn(array $row): array => self::row($row),
            $rows
        );
    }
    public static function row(array $row, bool $detailed = false): array
    {
        $accountId = isset($row['account_id']) ? (int) $row['account_id'] : null;
        $displayName = self::displayName($row);
        $item = [
            'id' => (int) $row['id'],
            'account_id' => $accountId,
            'account_username' => $row['account_username'] ?? null,
            'account_email' => $row['account_email'] ?? null,
            'account_name' => trim((string) ($row['account_name'] ?? '')),
            'display_name' => $displayName,
            'full_name' => $displayName,
            'role_text' => $row['role_text'],
            'title' => $displayName,
            'body' => $row['role_text'],
            'avatar' => MediaPaths::teamAvatarUrl($accountId),
            'linkedin' => self::socialUsername($row['linkedin'] ?? '', 'linkedin') ?: null,
            'github' => self::socialUsername($row['github'] ?? '', 'github') ?: null,
            'status' => $row['status'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'] ?? null,
        ];
        if ($detailed) {
            $item['avatar_filename'] = null;
        }
        return $item;
    }
}
