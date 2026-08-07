<?php
namespace Admin;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
use Nesh\Validate;
class Careers
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
        $listing = CareerFields::validate(Request::body());
        Query::execute(
            "INSERT INTO careers(
                title,
                location,
                employment_type,
                description,
                requirements,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?)",
            [
                $listing['title'],
                $listing['location'] !== '' ? $listing['location'] : null,
                $listing['employment_type'],
                $listing['description'],
                $listing['requirements_json'],
                $listing['status']
            ]
        );
        Response::created(['id' => Query::lastId()]);
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
                title,
                location,
                employment_type,
                description,
                requirements,
                status,
                created_at,
                updated_at
            FROM careers
            ORDER BY id DESC"
        );
        Response::success(CareerFields::rows($rows));
    }
    public function one(): void
    {
        Request::get();
        $id = CareerFields::id();
        $row = Query::fetch(
            "SELECT
                id,
                title,
                location,
                employment_type,
                description,
                requirements,
                status,
                created_at,
                updated_at
            FROM careers
            WHERE id = ?
            LIMIT 1",
            [$id]
        );
        if (!$row) {
            Response::notFound('Career not found');
        }
        Response::success(CareerFields::row($row));
    }
}
class Update
{
    public function index(): void
    {
        Request::patch();
        $id = CareerFields::id();
        if (!Query::exists("SELECT 1 FROM careers WHERE id = ? LIMIT 1", [$id])) {
            Response::notFound('Career not found');
        }
        $input = Request::body();
        if (!$input) {
            Response::badRequest('No data provided');
        }
        $fields = [];
        $params = [];
        if (array_key_exists('title', $input)) {
            $title = trim((string) $input['title']);
            if (!Validate::required($title)) {
                Response::badRequest('Title is required');
            }
            $fields[] = 'title = ?';
            $params[] = $title;
        }
        if (array_key_exists('location', $input)) {
            $fields[] = 'location = ?';
            $params[] = trim((string) $input['location']) ?: null;
        }
        if (array_key_exists('employment_type', $input)) {
            $fields[] = 'employment_type = ?';
            $params[] = CareerFields::employmentType($input['employment_type']);
        }
        if (array_key_exists('description', $input)) {
            $fields[] = 'description = ?';
            $params[] = trim((string) $input['description']);
        }
        if (
            array_key_exists('requirements', $input)
            || array_key_exists('requirements_raw', $input)
        ) {
            $requirements = CareerFields::requirements(
                $input['requirements'] ?? $input['requirements_raw'] ?? ''
            );
            $fields[] = 'requirements = ?';
            $params[] = json_encode(
                $requirements,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            );
        }
        if (array_key_exists('status', $input)) {
            $fields[] = 'status = ?';
            $params[] = CareerFields::status($input['status']);
        }
        if (!$fields) {
            Response::success('Nothing changed');
        }
        $params[] = $id;
        Query::execute(
            "UPDATE careers
            SET " . implode(', ', $fields) . "
            WHERE id = ?",
            $params
        );
        Response::success('Career updated');
    }
}
class Delete
{
    public function index(): void
    {
        Request::delete();
        $id = CareerFields::id();
        if (!Query::exists("SELECT 1 FROM careers WHERE id = ? LIMIT 1", [$id])) {
            Response::notFound('Career not found');
        }
        Query::execute("DELETE FROM careers WHERE id = ?", [$id]);
        Response::success('Career deleted');
    }
}
class CareerFields
{
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
    public static function employmentType(mixed $value): string
    {
        $value = strtolower(trim((string) $value));
        if ($value === '') {
            return 'full_time';
        }
        return $value;
    }
    public static function requirements(mixed $raw): array
    {
        if (is_array($raw)) {
            return array_values(array_filter(array_map(
                fn($item) => trim((string) $item),
                $raw
            )));
        }
        if (is_string($raw) && Validate::json($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return self::requirements($decoded);
            }
        }
        return array_values(array_filter(array_map(
            'trim',
            preg_split('/\r\n|\r|\n/', (string) $raw) ?: []
        )));
    }
    public static function validate(array $input): array
    {
        $title = trim((string) ($input['title'] ?? ''));
        if (!Validate::required($title)) {
            Response::badRequest('Title is required');
        }
        $requirements = self::requirements(
            $input['requirements'] ?? $input['requirements_raw'] ?? ''
        );
        $description = trim((string) ($input['description'] ?? ''));
        if ($description === '' && $requirements) {
            $description = implode("\n", $requirements);
        }
        return [
            'title' => $title,
            'location' => trim((string) ($input['location'] ?? '')),
            'employment_type' => self::employmentType($input['employment_type'] ?? 'full_time'),
            'description' => $description !== '' ? $description : $title,
            'requirements_json' => json_encode(
                $requirements,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
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
    public static function row(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'title' => $row['title'],
            'location' => $row['location'],
            'employment_type' => $row['employment_type'],
            'description' => $row['description'],
            'requirements' => self::requirements($row['requirements'] ?? '[]'),
            'status' => $row['status'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }
}
