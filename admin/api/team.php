<?php
namespace Admin;
use Nesh\File;
use Nesh\Generate;
use Nesh\Image;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
use Nesh\Validate;
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
            'POST'   => fn() => $this->create->index(),
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
        $member = TeamFields::validate(Request::body());
        $uuid = Generate::uuid();
        Query::begin();
        try {
            Query::execute(
                "INSERT INTO ielectro_admin.team(
                    uuid,
                    full_name,
                    role_text,
                    avatar,
                    instagram,
                    linkedin,
                    github,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    $uuid,
                    $member['full_name'],
                    $member['role_text'],
                    $member['avatar'] !== '' ? $member['avatar'] : null,
                    $member['instagram'] !== '' ? $member['instagram'] : null,
                    $member['linkedin'] !== '' ? $member['linkedin'] : null,
                    $member['github'] !== '' ? $member['github'] : null,
                    $member['status']
                ]
            );
            $id = Query::lastId();
            $uploaded = TeamFields::storeImage(
                $uuid,
                Request::file('image') ?: Request::file('avatar')
            );
            if ($uploaded !== null) {
                Query::execute(
                    "UPDATE ielectro_admin.team SET avatar = ? WHERE id = ?",
                    [$uploaded, $id]
                );
            }
            Query::commit();
        } catch (\Throwable $e) {
            Query::rollback();
            TeamFields::removeImages($uuid);
            Response::error('Unable to create team member');
        }
        Response::created(['id' => $id]);
    }
}
class Data
{
    public function list(): void
    {
        Request::get();
        $rows = Query::fetchAll(
            "SELECT
                id,
                full_name,
                role_text,
                avatar,
                instagram,
                linkedin,
                github,
                status,
                created_at,
                updated_at
            FROM ielectro_admin.team
            ORDER BY id DESC"
        );
        Response::success(TeamFields::rows($rows));
    }
    public function one(): void
    {
        Request::get();
        $id = TeamFields::id();
        $row = Query::fetch(
            "SELECT
                id,
                full_name,
                role_text,
                avatar,
                instagram,
                linkedin,
                github,
                status,
                created_at,
                updated_at
            FROM ielectro_admin.team
            WHERE id = ?
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
        Request::patch();
        $id = TeamFields::id();
        $row = Query::fetch(
            "SELECT uuid
            FROM ielectro_admin.team
            WHERE id = ?
            LIMIT 1",
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
        if (array_key_exists('full_name', $input) || array_key_exists('title', $input)) {
            $fullName = trim((string) ($input['full_name'] ?? $input['title'] ?? ''));
            if (!Validate::required($fullName)) {
                Response::badRequest('Name is required');
            }
            $fields[] = 'full_name = ?';
            $params[] = $fullName;
        }
        if (array_key_exists('role_text', $input) || array_key_exists('body', $input)) {
            $role = trim((string) ($input['role_text'] ?? $input['body'] ?? ''));
            if (!Validate::required($role)) {
                Response::badRequest('Role is required');
            }
            $fields[] = 'role_text = ?';
            $params[] = $role;
        }
        if (array_key_exists('status', $input)) {
            $fields[] = 'status = ?';
            $params[] = TeamFields::status($input['status']);
        }
        foreach (['instagram', 'linkedin', 'github'] as $field) {
            if (!array_key_exists($field, $input)) {
                continue;
            }
            $value = trim((string) $input[$field]);
            $fields[] = "{$field} = ?";
            $params[] = $value !== '' ? $value : null;
        }
        if (array_key_exists('avatar', $input)) {
            $avatar = TeamFields::filename($input['avatar']);
            $fields[] = 'avatar = ?';
            $params[] = $avatar !== '' ? $avatar : null;
        }
        $uploaded = TeamFields::storeImage(
            $row['uuid'],
            Request::file('image') ?: Request::file('avatar')
        );
        if ($uploaded !== null) {
            $fields[] = 'avatar = ?';
            $params[] = $uploaded;
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
        $id = TeamFields::id();
        $row = Query::fetch(
            "SELECT uuid
            FROM ielectro_admin.team
            WHERE id = ?
            LIMIT 1",
            [$id]
        );
        if (!$row) {
            Response::notFound('Team member not found');
        }
        TeamFields::removeImages($row['uuid']);
        Query::execute("DELETE FROM ielectro_admin.team WHERE id = ?", [$id]);
        Response::success('Team member deleted');
    }
}
class TeamFields
{
    private const SECTION = 'team';
    public static function id(): int
    {
        $id = Routing::id();
        if ($id === null || $id <= 0) {
            Response::badRequest('Invalid id');
        }
        return $id;
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
    public static function filename(?string $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }
        if (preg_match('#^https?://#i', $value)) {
            return $value;
        }
        return basename($value);
    }
    public static function contentDir(): string
    {
        $path = APP_PUBLIC . '/content/' . self::SECTION;
        File::makeDirectory($path);
        return $path;
    }
    public static function imageUrl(?string $filename): ?string
    {
        if ($filename === null || $filename === '') {
            return null;
        }
        if (preg_match('#^https?://#i', $filename)) {
            return $filename;
        }
        return APP_URL . '/content/' . self::SECTION . '/' . rawurlencode(basename($filename));
    }
    public static function storeImage(string $basename, ?array $file): ?string
    {
        if (
            !$file
            || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK
        ) {
            return null;
        }
        self::removeImages($basename);
        $image = Image::upload($file, $basename, true);
        $image->save(self::contentDir());
        return $image->basename() . '.' . $image->extension();
    }
    public static function removeImages(string $basename): void
    {
        foreach (glob(self::contentDir() . '/' . $basename . '.*') ?: [] as $path) {
            @unlink($path);
        }
    }
    public static function validate(array $input): array
    {
        $fullName = trim((string) ($input['full_name'] ?? $input['title'] ?? ''));
        $role = trim((string) ($input['role_text'] ?? $input['body'] ?? ''));
        $avatar = self::filename($input['avatar'] ?? '');
        if (!Validate::required($fullName)) {
            Response::badRequest('Name is required');
        }
        if (!Validate::required($role)) {
            Response::badRequest('Role is required');
        }
        return [
            'full_name' => $fullName,
            'role_text' => $role,
            'avatar' => $avatar,
            'instagram' => trim((string) ($input['instagram'] ?? '')),
            'linkedin' => trim((string) ($input['linkedin'] ?? '')),
            'github' => trim((string) ($input['github'] ?? '')),
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
        $item = [
            'id' => (int) $row['id'],
            'full_name' => $row['full_name'],
            'role_text' => $row['role_text'],
            'avatar' => self::imageUrl($row['avatar'] ?? null),
            'instagram' => $row['instagram'],
            'linkedin' => $row['linkedin'],
            'github' => $row['github'],
            'status' => $row['status'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'] ?? null,
        ];
        if ($detailed) {
            $item['avatar_filename'] = self::filename($row['avatar'] ?? '');
        }
        return $item;
    }
}
