<?php
namespace Dyscover;
use Nesh\Audio;
use Nesh\File;
use Nesh\Image;
use Nesh\Pdf;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
use Nesh\Validate;
use Nesh\Video;
class Posts
{
    public function index(): void
    {
        $resource = Routing::segment(3);
        if ($resource === 'comments') {
            (new PostComments())->index();
            return;
        }
        if ($resource === 'likes') {
            (new PostLikes())->index();
            return;
        }
        if ($resource === 'bookmarks') {
            (new PostBookmarks())->index();
            return;
        }
        if ($resource === 'reposts') {
            (new PostReposts())->index();
            return;
        }
        if ($resource === 'shares') {
            (new PostShares())->index();
            return;
        }
        if ($resource === 'views') {
            (new PostViews())->index();
            return;
        }
        Routing::method([
            'GET'    => fn() => $this->show(),
            'POST'   => fn() => $this->create(),
            'PATCH'  => fn() => $this->update(),
            'DELETE' => fn() => $this->delete(),
        ]);
    }
    private function show(): void
    {
        Request::get();
        $id = Routing::id();
        if ($id === null) {
            Response::badRequest('Missing post id');
        }
        Response::success(PostData::one($id));
    }
    private function create(): void
    {
        Request::post();
        $input = Request::body();
        $type = trim((string) ($input['type'] ?? ''));
        if (!Validate::in($type, PostData::TYPES)) {
            Response::badRequest('Invalid post type');
        }
        $title = trim((string) ($input['title'] ?? ''));
        if (!Validate::required($title)) {
            Response::badRequest('Missing title');
        }
        $uuid = PostAssets::requireUuid($input['uuid'] ?? '');
        if (Query::exists(
            'SELECT 1 FROM dyscover_posts WHERE uuid = ? LIMIT 1',
            [$uuid]
        )) {
            Response::conflict('Uuid already exists');
        }
        $userId = User::id();
        $description = trim((string) ($input['description'] ?? ''));
        $visibility = trim((string) ($input['visibility'] ?? 'public'));
        $extension = '';
        $previewImage = '';
        $html = null;
        $mediaFile = null;
        if ($type === 'article') {
            $html = (string) ($input['html'] ?? '');
            if (!Validate::required($html)) {
                Response::badRequest('Missing html');
            }
        } elseif ($type === 'template') {
            if (!array_key_exists('fields', $input)) {
                Response::badRequest('Missing fields');
            }
        } elseif (PostAssets::isMediaType($type)) {
            $mediaFile = Request::file('media');
            if (!$mediaFile) {
                Response::badRequest('Missing media file');
            }
            $processed = PostAssets::storeMedia($type, $mediaFile, $userId, $uuid, false);
            $extension = $processed['extension'];
            $previewImage = $processed['preview_image'];
        }
        Query::execute(
            "INSERT INTO dyscover_posts(
                user_id, uuid, type, title, description,
                extension, preview_image, visibility, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')",
            [
                $userId,
                $uuid,
                $type,
                $title,
                $description,
                $extension,
                $previewImage,
                $visibility,
            ]
        );
        $id = Query::lastId();
        Query::execute(
            'INSERT INTO dyscover_post_statistics(post_id) VALUES(?)',
            [$id]
        );
        if ($type === 'article') {
            PostAssets::saveArticle($userId, $uuid, $html);
        } elseif ($type === 'template') {
            TemplateFields::sync($id, $input['fields']);
        }
        Response::created(['id' => $id, 'uuid' => $uuid]);
    }
    private function update(): void
    {
        Request::patch();
        $post = PostData::requireOwned(Routing::id());
        $input = Request::body();
        $userId = (int) $post['user_id'];
        $uuid = (string) $post['uuid'];
        $type = (string) $post['type'];
        $postId = (int) $post['id'];
        $updated = false;
        $fields = [];
        $params = [];
        foreach (['title', 'description', 'visibility'] as $field) {
            if (!array_key_exists($field, $input)) {
                continue;
            }
            $fields[] = "{$field} = ?";
            $params[] = trim((string) $input[$field]);
            $updated = true;
        }
        if ($fields) {
            $params[] = $postId;
            Query::execute(
                'UPDATE dyscover_posts SET ' . implode(', ', $fields) . ' WHERE id = ?',
                $params
            );
        }
        if (array_key_exists('html', $input)) {
            if ($type !== 'article') {
                Response::badRequest('Html is only valid for articles');
            }
            PostAssets::saveArticle($userId, $uuid, (string) $input['html']);
            $updated = true;
        }
        $mediaFile = Request::file('media');
        if ($mediaFile) {
            if (!PostAssets::isMediaType($type)) {
                Response::badRequest('Media is only valid for media posts');
            }
            $processed = PostAssets::storeMedia($type, $mediaFile, $userId, $uuid, true);
            Query::execute(
                'UPDATE dyscover_posts SET extension = ?, preview_image = ? WHERE id = ?',
                [$processed['extension'], $processed['preview_image'], $postId]
            );
            $updated = true;
        }
        if (array_key_exists('fields', $input)) {
            if ($type !== 'template') {
                Response::badRequest('Fields are only valid for templates');
            }
            TemplateFields::sync($postId, $input['fields']);
            $updated = true;
        }
        if (!$updated) {
            Response::badRequest('Nothing to update');
        }
        Response::success(PostData::one($postId));
    }
    private function delete(): void
    {
        Request::delete();
        $post = PostData::requireOwned(Routing::id());
        Query::execute(
            "UPDATE dyscover_posts SET status = 'hidden' WHERE id = ?",
            [(int) $post['id']]
        );
        Response::success('Post deleted');
    }
}
class PostData
{
    public const TYPES = [
        'article', 'image', 'video', 'audio', 'document', 'template',
    ];
    public static function one(int $id): array
    {
        $row = self::fetchRow('p.id = ?', [$id]);
        if (!$row || $row['status'] !== 'active') {
            Response::notFound('Post not found');
        }
        return self::map($row);
    }
    public static function requireOwned(?int $id): array
    {
        if ($id === null || $id <= 0) {
            Response::badRequest('Missing post id');
        }
        $row = Query::fetch(
            'SELECT * FROM dyscover_posts WHERE id = ? LIMIT 1',
            [$id]
        );
        if (!$row || $row['status'] !== 'active') {
            Response::notFound('Post not found');
        }
        if ((int) $row['user_id'] !== User::id()) {
            Response::forbidden();
        }
        return $row;
    }
    public static function listByUser(int $userId): array
    {
        $rows = Query::fetchAll(
            self::selectSql() . "
            WHERE p.user_id = ?
            AND p.status = 'active'
            ORDER BY p.published_at DESC, p.id DESC",
            [$userId]
        );
        return self::mapRows($rows);
    }
    public static function listByEngagement(string $table, int $userId): array
    {
        $rows = Query::fetchAll(
            self::selectSql() . "
            INNER JOIN {$table} r ON r.post_id = p.id
            WHERE r.user_id = ?
            AND p.status = 'active'
            ORDER BY r.created_at DESC",
            [$userId]
        );
        return self::mapRows($rows);
    }
    public static function mapRows(array $rows): array
    {
        return array_map(fn(array $row): array => self::map($row), $rows);
    }
    public static function map(array $row): array
    {
        $id = (int) $row['id'];
        $viewerId = User::id();
        return [
            'id' => $id,
            'user_id' => (int) $row['user_id'],
            'username' => $row['username'] ?? '',
            'uuid' => $row['uuid'],
            'type' => $row['type'],
            'title' => $row['title'] ?? '',
            'description' => $row['description'] ?? '',
            'preview_image' => $row['preview_image'] ?? '',
            'visibility' => $row['visibility'],
            'likes' => (int) ($row['likes'] ?? 0),
            'comments' => (int) ($row['comments'] ?? 0),
            'shares' => (int) ($row['shares'] ?? 0),
            'bookmarks' => (int) ($row['bookmarks'] ?? 0),
            'views' => (int) ($row['views'] ?? 0),
            'published_at' => $row['published_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
            'liked' => PostEngagement::exists('dyscover_post_likes', $id, $viewerId),
            'bookmarked' => PostEngagement::exists('dyscover_post_bookmarks', $id, $viewerId),
        ];
    }
    private static function fetchRow(string $where, array $params): ?array
    {
        return Query::fetch(self::selectSql() . " WHERE {$where} LIMIT 1", $params);
    }
    private static function selectSql(): string
    {
        return "SELECT
                p.*,
                a.username,
                s.views,
                s.likes,
                s.comments,
                s.shares,
                s.bookmarks
            FROM dyscover_posts p
            INNER JOIN dyscover_users du ON du.id = p.user_id
            INNER JOIN accounts a ON a.id = du.account_id
            LEFT JOIN dyscover_post_statistics s ON s.post_id = p.id";
    }
}
class PostEngagement
{
    public static function exists(string $table, int $postId, int $userId): bool
    {
        return Query::exists(
            "SELECT 1 FROM {$table} WHERE post_id = ? AND user_id = ? LIMIT 1",
            [$postId, $userId]
        );
    }
    public static function add(string $table, string $stat, int $postId): void
    {
        $userId = User::id();
        Query::execute(
            "INSERT IGNORE INTO {$table}(post_id, user_id) VALUES(?, ?)",
            [$postId, $userId]
        );
        self::adjustStat($stat, $postId, 1);
    }
    public static function remove(string $table, string $stat, int $postId): void
    {
        Query::execute(
            "DELETE FROM {$table} WHERE post_id = ? AND user_id = ?",
            [$postId, User::id()]
        );
        self::adjustStat($stat, $postId, -1);
    }
    private static function adjustStat(string $field, int $postId, int $delta): void
    {
        Query::execute(
            "UPDATE dyscover_post_statistics
            SET {$field} = GREATEST(0, {$field} + ?)
            WHERE post_id = ?",
            [$delta, $postId]
        );
    }
    public static function adjustStatDirect(string $field, int $postId, int $delta): void
    {
        self::adjustStat($field, $postId, $delta);
    }
}
class PostComments
{
    public function index(): void
    {
        Routing::method([
            'GET'    => fn() => $this->list(),
            'POST'   => fn() => $this->create(),
            'PATCH'  => fn() => $this->update(),
            'DELETE' => fn() => $this->delete(),
        ]);
    }
    private function list(): void
    {
        Request::get();
        $postId = Routing::id();
        if ($postId === null) {
            Response::badRequest('Missing post id');
        }
        $rows = Query::fetchAll(
            "SELECT c.id, c.user_id, c.body, c.created_at, a.username
            FROM dyscover_post_comments c
            INNER JOIN dyscover_users du ON du.id = c.user_id
            INNER JOIN accounts a ON a.id = du.account_id
            WHERE c.post_id = ? AND c.status = 'active'
            ORDER BY c.id ASC",
            [$postId]
        );
        Response::success(array_map(fn(array $row): array => [
            'id' => (int) $row['id'],
            'user_id' => (int) $row['user_id'],
            'username' => $row['username'],
            'avatar' => Avatar::url((int) $row['user_id']),
            'body' => $row['body'],
            'created_at' => $row['created_at'],
        ], $rows));
    }
    private function create(): void
    {
        Request::post();
        $postId = Routing::id();
        if ($postId === null) {
            Response::badRequest('Missing post id');
        }
        $body = trim((string) Request::value('body'));
        if (!Validate::required($body)) {
            Response::badRequest('Empty comment');
        }
        Query::execute(
            "INSERT INTO dyscover_post_comments(post_id, user_id, body, status)
            VALUES (?, ?, ?, 'active')",
            [$postId, User::id(), $body]
        );
        PostEngagement::adjustStatDirect('comments', $postId, 1);
        Response::created(['id' => Query::lastId()]);
    }
    private function update(): void
    {
        Request::patch();
        $commentId = (int) Routing::segment(4);
        $body = trim((string) Request::value('body'));
        if (!Validate::required($body)) {
            Response::badRequest('Empty comment');
        }
        Query::execute(
            "UPDATE dyscover_post_comments
            SET body = ?
            WHERE id = ? AND user_id = ? AND status = 'active'",
            [$body, $commentId, User::id()]
        );
        Response::success('Comment updated');
    }
    private function delete(): void
    {
        Request::delete();
        $commentId = (int) Routing::segment(4);
        $row = Query::fetch(
            'SELECT post_id FROM dyscover_post_comments
            WHERE id = ? AND user_id = ? LIMIT 1',
            [$commentId, User::id()]
        );
        if (!$row) {
            Response::notFound('Comment not found');
        }
        Query::execute(
            "UPDATE dyscover_post_comments SET status = 'hidden' WHERE id = ?",
            [$commentId]
        );
        PostEngagement::adjustStatDirect('comments', (int) $row['post_id'], -1);
        Response::success('Comment deleted');
    }
}
class PostLikes
{
    public function index(): void
    {
        Routing::method([
            'POST'   => fn() => $this->add(),
            'DELETE' => fn() => $this->remove(),
        ]);
    }
    private function add(): void
    {
        Request::post();
        PostEngagement::add('dyscover_post_likes', 'likes', (int) Routing::id());
        Response::created('Liked');
    }
    private function remove(): void
    {
        Request::delete();
        PostEngagement::remove('dyscover_post_likes', 'likes', (int) Routing::id());
        Response::success('Unliked');
    }
}
class PostBookmarks
{
    public function index(): void
    {
        Routing::method([
            'POST'   => fn() => $this->add(),
            'DELETE' => fn() => $this->remove(),
        ]);
    }
    private function add(): void
    {
        Request::post();
        PostEngagement::add('dyscover_post_bookmarks', 'bookmarks', (int) Routing::id());
        Response::created('Bookmarked');
    }
    private function remove(): void
    {
        Request::delete();
        PostEngagement::remove('dyscover_post_bookmarks', 'bookmarks', (int) Routing::id());
        Response::success('Bookmark removed');
    }
}
class PostReposts
{
    public function index(): void
    {
        Routing::method([
            'POST'   => fn() => $this->add(),
            'DELETE' => fn() => $this->remove(),
        ]);
    }
    private function add(): void
    {
        Request::post();
        PostEngagement::add('dyscover_post_reposts', 'shares', (int) Routing::id());
        Response::created('Reposted');
    }
    private function remove(): void
    {
        Request::delete();
        PostEngagement::remove('dyscover_post_reposts', 'shares', (int) Routing::id());
        Response::success('Repost removed');
    }
}
class PostShares
{
    public function index(): void
    {
        Routing::method([
            'POST' => fn() => $this->add(),
        ]);
    }
    private function add(): void
    {
        Request::post();
        PostEngagement::add('dyscover_post_shares', 'shares', (int) Routing::id());
        Response::created('Shared');
    }
}
class PostViews
{
    public function index(): void
    {
        Routing::method([
            'POST' => fn() => $this->add(),
        ]);
    }
    private function add(): void
    {
        Request::post();
        $postId = (int) Routing::id();
        $userId = User::id();
        $exists = Query::exists(
            'SELECT 1 FROM dyscover_post_views
            WHERE post_id = ? AND user_id = ?
            AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
            LIMIT 1',
            [$postId, $userId]
        );
        if (!$exists) {
            Query::execute(
                'INSERT INTO dyscover_post_views(post_id, user_id) VALUES(?, ?)',
                [$postId, $userId]
            );
            PostEngagement::adjustStatDirect('views', $postId, 1);
        }
        Response::created('View recorded');
    }
}
class PostAssets
{
    public const MEDIA_TYPES = ['image', 'video', 'audio', 'document'];
    private const ASSET_FOLDERS = [
        'article' => 'articles',
        'image' => 'images',
        'video' => 'videos',
        'audio' => 'audios',
        'document' => 'documents',
    ];
    public static function isMediaType(string $type): bool
    {
        return in_array($type, self::MEDIA_TYPES, true);
    }
    public static function assetFolder(string $type): string
    {
        return self::ASSET_FOLDERS[$type] ?? $type;
    }
    public static function requireUuid(mixed $value): string
    {
        $uuid = strtolower(trim((string) $value));
        if (!preg_match('/^[0-9a-f]{16}$/', $uuid)) {
            Response::badRequest('Invalid uuid');
        }
        return $uuid;
    }
    public static function articlePath(int $userId, string $uuid): string
    {
        return APP_ASSETS
            . '/users/' . $userId
            . '/' . self::assetFolder('article')
            . '/' . $uuid . '.html';
    }
    public static function mediaDir(int $userId, string $type): string
    {
        return APP_ASSETS
            . '/users/' . $userId
            . '/' . self::assetFolder($type);
    }
    public static function mediaUrl(
        int $userId,
        string $type,
        string $uuid,
        string $extension
    ): string {
        return APP_URL
            . '/assets/users/' . $userId
            . '/' . self::assetFolder($type)
            . '/' . $uuid . '.' . ltrim($extension, '.');
    }
    public static function saveArticle(int $userId, string $uuid, string $html): void
    {
        $path = self::articlePath($userId, $uuid);
        File::makeDirectory(dirname($path));
        if (file_put_contents($path, $html) === false) {
            Response::error('Unable to save article');
        }
    }
    public static function storeMedia(
        string $type,
        array $file,
        int $userId,
        string $uuid,
        bool $overwrite
    ): array {
        $dir = self::mediaDir($userId, $type);
        File::makeDirectory($dir);
        if ($overwrite) {
            self::clearMediaAssets($dir, $uuid);
        }
        return match ($type) {
            'image' => self::storeImage($file, $uuid, $dir, $userId),
            'video' => self::storeVideo($file, $uuid, $dir, $userId),
            'audio' => self::storeAudio($file, $uuid, $dir),
            'document' => self::storeDocument($file, $uuid, $dir),
            default => Response::badRequest('Invalid media type'),
        };
    }
    private static function clearMediaAssets(string $dir, string $uuid): void
    {
        foreach (glob($dir . '/' . $uuid . '.*') ?: [] as $path) {
            if (is_file($path)) {
                unlink($path);
            }
        }
        $preview = $dir . '/' . $uuid . '_preview.jpg';
        if (is_file($preview)) {
            unlink($preview);
        }
    }
    private static function storeImage(
        array $file,
        string $uuid,
        string $dir,
        int $userId
    ): array {
        $image = Image::upload($file, $uuid, false);
        $image->compress(80)->save($dir);
        $extension = $image->extension() ?? 'jpg';
        return [
            'extension' => $extension,
            'preview_image' => self::mediaUrl($userId, 'image', $uuid, $extension),
        ];
    }
    private static function storeVideo(
        array $file,
        string $uuid,
        string $dir,
        int $userId
    ): array {
        $video = Video::upload($file, $uuid, false);
        $video->compress()->save($dir);
        $extension = $video->extension() ?? 'mp4';
        $previewImage = self::saveVideoPreview($video, $dir, $uuid, $userId);
        return [
            'extension' => $extension,
            'preview_image' => $previewImage,
        ];
    }
    private static function storeAudio(array $file, string $uuid, string $dir): array
    {
        $audio = Audio::upload($file, $uuid, false);
        $audio->compress()->save($dir);
        return [
            'extension' => $audio->extension() ?? 'mp3',
            'preview_image' => '',
        ];
    }
    private static function storeDocument(array $file, string $uuid, string $dir): array
    {
        $pdf = Pdf::upload($file, $uuid, false);
        $pdf->save($dir);
        return [
            'extension' => $pdf->extension() ?? 'pdf',
            'preview_image' => '',
        ];
    }
    private static function saveVideoPreview(
        Video $video,
        string $dir,
        string $uuid,
        int $userId
    ): string {
        $video->thumbnail();
        $thumbPath = $video->thumbnailPath();
        if ($thumbPath === null || !is_file($thumbPath)) {
            return '';
        }
        $previewPath = $dir . '/' . $uuid . '_preview.jpg';
        File::makeDirectory($dir);
        if (!File::copyPath($thumbPath, $previewPath, true)) {
            Response::error('Unable to save preview');
        }
        if (is_file($thumbPath)) {
            unlink($thumbPath);
        }
        return APP_URL
            . '/assets/users/' . $userId
            . '/videos/' . $uuid . '_preview.jpg';
    }
}
