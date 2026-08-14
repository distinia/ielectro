<?php
namespace Admin;
use Nesh\File;
use Nesh\Generate;
use Nesh\Identity;
use Nesh\Image;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
use Nesh\Validate;

require_once __DIR__ . '/access.php';
require_once __DIR__ . '/paths.php';
class News
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
        $input = Request::body();
        $title = trim((string) ($input['title'] ?? ''));
        $body = trim((string) ($input['body'] ?? ''));
        $status = NewsFields::status($input['status'] ?? 'published');
        $imageInput = NewsFields::filename($input['image'] ?? '');
        if (!Validate::required($title)) {
            Response::badRequest('Title is required');
        }
        if (!Validate::required($body)) {
            Response::badRequest('Body is required');
        }
        $image = preg_match('#^https?://#i', $imageInput) ? $imageInput : '';
        $uuid = Generate::uuid();
        Query::begin();
        try {
            Query::execute(
                "INSERT INTO ielectro_admin.news(
                    author_id,
                    uuid,
                    title,
                    body,
                    image,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?)",
                [
                    Identity::id(),
                    $uuid,
                    $title,
                    $body,
                    $image !== '' ? $image : null,
                    $status
                ]
            );
            $id = Query::lastId();
            $uploaded = NewsFields::storeImage(
                $uuid,
                Request::file('image')
            );
            if ($uploaded !== null) {
                Query::execute(
                    "UPDATE ielectro_admin.news SET image = ? WHERE id = ?",
                    [$uploaded, $id]
                );
            }
            Query::commit();
        } catch (\Throwable $e) {
            Query::rollback();
            NewsFields::removeImages($uuid);
            Response::error('Unable to create news');
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
                title,
                body,
                status,
                image,
                published_at,
                updated_at
            FROM ielectro_admin.news
            ORDER BY published_at DESC, id DESC"
        );
        Response::success(NewsFields::rows($rows));
    }
    public function one(): void
    {
        Request::get();
        $id = NewsFields::id();
        $row = Query::fetch(
            "SELECT
                id,
                title,
                body,
                status,
                image,
                published_at,
                updated_at
            FROM ielectro_admin.news
            WHERE id = ?
            LIMIT 1",
            [$id]
        );
        if (!$row) {
            Response::notFound('News not found');
        }
        Response::success(NewsFields::row($row, true));
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
        $id = NewsFields::id();
        $row = Query::fetch(
            "SELECT uuid
            FROM ielectro_admin.news
            WHERE id = ?
            LIMIT 1",
            [$id]
        );
        if (!$row) {
            Response::notFound('News not found');
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
        if (array_key_exists('body', $input)) {
            $body = trim((string) $input['body']);
            if (!Validate::required($body)) {
                Response::badRequest('Body is required');
            }
            $fields[] = 'body = ?';
            $params[] = $body;
        }
        if (array_key_exists('status', $input)) {
            $fields[] = 'status = ?';
            $params[] = NewsFields::status($input['status']);
        }
        if (array_key_exists('image', $input)) {
            $imageInput = NewsFields::filename($input['image']);
            $image = preg_match('#^https?://#i', $imageInput)
                ? $imageInput
                : ($imageInput !== '' ? $imageInput : null);
            $fields[] = 'image = ?';
            $params[] = $image;
        }
        $uploaded = NewsFields::storeImage(
            $row['uuid'],
            Request::file('image')
        );
        if ($uploaded !== null) {
            $fields[] = 'image = ?';
            $params[] = $uploaded;
        }
        if (!$fields) {
            Response::success('Nothing changed');
        }
        $params[] = $id;
        Query::execute(
            "UPDATE ielectro_admin.news
            SET " . implode(', ', $fields) . "
            WHERE id = ?",
            $params
        );
        Response::success('News updated');
    }
}
class Delete
{
    public function index(): void
    {
        Request::delete();
        Access::requireMember();
        $id = NewsFields::id();
        $row = Query::fetch(
            "SELECT uuid
            FROM ielectro_admin.news
            WHERE id = ?
            LIMIT 1",
            [$id]
        );
        if (!$row) {
            Response::notFound('News not found');
        }
        NewsFields::removeImages($row['uuid']);
        Query::execute("DELETE FROM ielectro_admin.news WHERE id = ?", [$id]);
        Response::success('News deleted');
    }
}
class NewsFields
{
    private const SECTION = 'news';
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
        if (in_array($value, ['published', 'hidden', 'draft'], true)) {
            return $value;
        }
        if (in_array($value, ['1', 'true', 'active'], true)) {
            return 'published';
        }
        if (in_array($value, ['0', 'false'], true)) {
            return 'hidden';
        }
        return 'published';
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
        return MediaPaths::newsDir();
    }
    public static function imageUrl(?string $filename): ?string
    {
        return MediaPaths::newsUrl($filename);
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
            'title' => $row['title'],
            'body' => $row['body'],
            'status' => $row['status'],
            'image' => self::imageUrl($row['image'] ?? null),
            'published_at' => $row['published_at'],
            'created_at' => $row['published_at'],
            'updated_at' => $row['updated_at'] ?? null,
        ];
        if ($detailed) {
            $item['image_filename'] = self::filename($row['image'] ?? '');
        }
        return $item;
    }
}
