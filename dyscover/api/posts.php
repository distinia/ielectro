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
        $userId = User::id();
        $existing = Query::fetch(
            'SELECT id, uuid, user_id FROM ielectro_dyscover.dyscover_posts WHERE uuid = ? LIMIT 1',
            [$uuid]
        );
        if ($existing) {
            if ((int) $existing['user_id'] === $userId) {
                Response::created([
                    'id' => (int) $existing['id'],
                    'uuid' => (string) $existing['uuid'],
                ]);
                return;
            }
            Response::conflict('Uuid already exists');
        }
        $description = trim((string) ($input['description'] ?? ''));
        $visibility = trim((string) ($input['visibility'] ?? 'public'));
        $extension = '';
        $previewImage = '';
        $html = null;
        $mediaFile = null;
        if ($type === 'template') {
            $previewFile = Request::file('preview');
            if ($previewFile) {
                $previewImage = PostAssets::storeTemplatePreview(
                    $previewFile,
                    $userId,
                    $uuid,
                    false
                );
            }
        }
        if ($type === 'article') {
            $html = '<p class="paragraph">Start here...</p>';
        } elseif ($type === 'template') {
            $input['fields'] = self::parseTemplateFields($input['fields'] ?? null);
            if (!is_array($input['fields'])) {
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
        if ($previewImage === '') {
            $previewImage = PostAssets::defaultPreview();
        }
        Query::execute(
            "INSERT INTO ielectro_dyscover.dyscover_posts(
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
            'INSERT INTO ielectro_dyscover.dyscover_post_statistics(post_id) VALUES(?)',
            [$id]
        );
        if ($type === 'article') {
            PostAssets::saveArticle($userId, $uuid, $html);
        } elseif ($type === 'template') {
            TemplateFields::sync($id, $input['fields']);
        }
        if (array_key_exists('tags', $input)) {
            PostTags::sync($id, $input['tags']);
        }
        Response::created(['id' => $id, 'uuid' => $uuid]);
    }
    private static function parseTemplateFields(mixed $fields): ?array
    {
        if (is_string($fields)) {
            $decoded = json_decode($fields, true);
            return is_array($decoded) ? $decoded : null;
        }
        return is_array($fields) ? $fields : null;
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
                'UPDATE ielectro_dyscover.dyscover_posts SET ' . implode(', ', $fields) . ' WHERE id = ?',
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
                'UPDATE ielectro_dyscover.dyscover_posts SET extension = ?, preview_image = ? WHERE id = ?',
                [$processed['extension'], $processed['preview_image'], $postId]
            );
            $updated = true;
        }
        if (array_key_exists('fields', $input)) {
            if ($type !== 'template') {
                Response::badRequest('Fields are only valid for templates');
            }
            $fields = self::parseTemplateFields($input['fields']);
            if (!is_array($fields)) {
                Response::badRequest('Invalid fields');
            }
            TemplateFields::sync($postId, $fields);
            $updated = true;
        }
        $previewFile = Request::file('preview');
        if ($previewFile) {
            if ($type !== 'template') {
                Response::badRequest('Preview is only valid for templates');
            }
            $previewImage = PostAssets::storeTemplatePreview(
                $previewFile,
                $userId,
                $uuid,
                true
            );
            Query::execute(
                'UPDATE ielectro_dyscover.dyscover_posts SET preview_image = ? WHERE id = ?',
                [$previewImage, $postId]
            );
            $updated = true;
        }
        if (array_key_exists('tags', $input)) {
            PostTags::sync($postId, $input['tags']);
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
            "UPDATE ielectro_dyscover.dyscover_posts SET status = 'hidden' WHERE id = ?",
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
            'SELECT * FROM ielectro_dyscover.dyscover_posts WHERE id = ? LIMIT 1',
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
        if (!$rows) {
            return [];
        }
        $rows = Accounts::attachUsernames($rows);
        $viewerId = User::id();
        $tagMap = PostTags::mapForPosts(array_map(
            static fn(array $row): int => (int) $row['id'],
            $rows
        ));
        return array_map(
            static fn(array $row): array => self::map(
                $row,
                $viewerId,
                $tagMap[(int) $row['id']] ?? []
            ),
            $rows
        );
    }
    public static function map(
        array $row,
        ?int $viewerId = null,
        ?array $tags = null
    ): array {
        $id = (int) $row['id'];
        if ($viewerId === null) {
            $viewerId = User::id();
        }
        if ($tags === null) {
            $tags = PostTags::names($id);
        }
        $userId = (int) $row['user_id'];
        $uuid = (string) $row['uuid'];
        $type = (string) $row['type'];
        $extension = (string) ($row['extension'] ?? '');
        $media = self::mediaUrl($row);
        $url = $type === 'article' && $uuid !== ''
            ? \APP_URL . '/article/' . $uuid
            : '';
        return [
            'id' => $id,
            'user_id' => $userId,
            'username' => $row['username'] ?? '',
            'avatar' => Avatar::url($userId),
            'uuid' => $uuid,
            'type' => $type,
            'title' => $row['title'] ?? '',
            'description' => $row['description'] ?? '',
            'tags' => $tags,
            'extension' => $extension,
            'preview_image' => ($row['preview_image'] ?? '') !== ''
                ? (string) $row['preview_image']
                : PostAssets::defaultPreview(),
            'media' => $media,
            'url' => $url,
            'visibility' => $row['visibility'],
            'likes' => (int) ($row['likes'] ?? 0),
            'comments' => (int) ($row['comments'] ?? 0),
            'shares' => (int) ($row['shares'] ?? 0),
            'bookmarks' => (int) ($row['bookmarks'] ?? 0),
            'views' => (int) ($row['views'] ?? 0),
            'published_at' => $row['published_at'] ?? null,
            'created_at' => $row['published_at'] ?? $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
            'liked' => PostEngagement::exists('ielectro_dyscover.dyscover_post_likes', $id, $viewerId),
            'bookmarked' => PostEngagement::exists('ielectro_dyscover.dyscover_post_bookmarks', $id, $viewerId),
        ];
    }
    private static function mediaUrl(array $row): string
    {
        $userId = (int) $row['user_id'];
        $uuid = (string) $row['uuid'];
        $type = (string) $row['type'];
        if ($uuid === '' || $userId <= 0) {
            return (string) ($row['preview_image'] ?? '');
        }
        if ($type === 'article') {
            return PostAssets::mediaUrl($userId, 'article', $uuid, 'html');
        }
        if ($type === 'template') {
            return (string) ($row['preview_image'] ?? '');
        }
        $extension = (string) ($row['extension'] ?? '');
        if ($extension === '') {
            return (string) ($row['preview_image'] ?? '');
        }
        return PostAssets::mediaUrl($userId, $type, $uuid, $extension);
    }
    private static function fetchRow(string $where, array $params): ?array
    {
        return Query::fetch(self::selectSql() . " WHERE {$where} LIMIT 1", $params);
    }
    private static function selectSql(): string
    {
        return "SELECT
                p.*,
                du.account_id,
                s.views,
                s.likes,
                s.comments,
                s.shares,
                s.bookmarks
            FROM ielectro_dyscover.dyscover_posts p
            INNER JOIN ielectro_dyscover.dyscover_users du ON du.id = p.user_id
            LEFT JOIN ielectro_dyscover.dyscover_post_statistics s ON s.post_id = p.id";
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
    public static function add(string $table, string $stat, int $postId): bool
    {
        $userId = User::id();
        $affected = Query::execute(
            "INSERT IGNORE INTO {$table}(post_id, user_id) VALUES(?, ?)",
            [$postId, $userId]
        );
        if ($affected > 0) {
            self::adjustStat($stat, $postId, 1);
            return true;
        }
        return false;
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
            "UPDATE ielectro_dyscover.dyscover_post_statistics
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
            "SELECT c.id, c.user_id, c.body, c.created_at, du.account_id
            FROM ielectro_dyscover.dyscover_post_comments c
            INNER JOIN ielectro_dyscover.dyscover_users du ON du.id = c.user_id
            WHERE c.post_id = ? AND c.status = 'active'
            ORDER BY c.id ASC",
            [$postId]
        );
        $rows = Accounts::attachUsernames($rows);
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
            "INSERT INTO ielectro_dyscover.dyscover_post_comments(post_id, user_id, body, status)
            VALUES (?, ?, ?, 'active')",
            [$postId, User::id(), $body]
        );
        PostEngagement::adjustStatDirect('comments', $postId, 1);
        $commentId = (int) Query::lastId();
        ActivityNotify::onComment($postId, User::id());
        Response::created(['id' => $commentId]);
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
            "UPDATE ielectro_dyscover.dyscover_post_comments
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
            'SELECT post_id FROM ielectro_dyscover.dyscover_post_comments
            WHERE id = ? AND user_id = ? LIMIT 1',
            [$commentId, User::id()]
        );
        if (!$row) {
            Response::notFound('Comment not found');
        }
        Query::execute(
            "UPDATE ielectro_dyscover.dyscover_post_comments SET status = 'hidden' WHERE id = ?",
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
        $postId = (int) Routing::id();
        if (PostEngagement::add('ielectro_dyscover.dyscover_post_likes', 'likes', $postId)) {
            ActivityNotify::onLike($postId, User::id());
        }
        Response::created('Liked');
    }
    private function remove(): void
    {
        Request::delete();
        PostEngagement::remove('ielectro_dyscover.dyscover_post_likes', 'likes', (int) Routing::id());
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
        PostEngagement::add('ielectro_dyscover.dyscover_post_bookmarks', 'bookmarks', (int) Routing::id());
        Response::created('Bookmarked');
    }
    private function remove(): void
    {
        Request::delete();
        PostEngagement::remove('ielectro_dyscover.dyscover_post_bookmarks', 'bookmarks', (int) Routing::id());
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
        $postId = (int) Routing::id();
        if (PostEngagement::add('ielectro_dyscover.dyscover_post_reposts', 'shares', $postId)) {
            ActivityNotify::onShare($postId, User::id());
        }
        Response::created('Reposted');
    }
    private function remove(): void
    {
        Request::delete();
        PostEngagement::remove('ielectro_dyscover.dyscover_post_reposts', 'shares', (int) Routing::id());
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
        $postId = (int) Routing::id();
        if (PostEngagement::add('ielectro_dyscover.dyscover_post_shares', 'shares', $postId)) {
            ActivityNotify::onShare($postId, User::id());
        }
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
            'SELECT 1 FROM ielectro_dyscover.dyscover_post_views
            WHERE post_id = ? AND user_id = ?
            AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
            LIMIT 1',
            [$postId, $userId]
        );
        if (!$exists) {
            Query::execute(
                'INSERT INTO ielectro_dyscover.dyscover_post_views(post_id, user_id) VALUES(?, ?)',
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
        'template' => 'templates',
    ];
    public static function defaultPreview(): string
    {
        return \APP_URL . '/assets/brand/default-post.jpg';
    }
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
        return \APP_ASSETS
            . '/users/' . $userId
            . '/' . self::assetFolder('article')
            . '/' . $uuid . '.html';
    }
    public static function mediaDir(int $userId, string $type): string
    {
        return \APP_ASSETS
            . '/users/' . $userId
            . '/' . self::assetFolder($type);
    }
    public static function mediaUrl(
        int $userId,
        string $type,
        string $uuid,
        string $extension
    ): string {
        return \APP_URL
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
    public static function storeTemplatePreview(
        array $file,
        int $userId,
        string $uuid,
        bool $overwrite
    ): string {
        $dir = self::mediaDir($userId, 'template');
        File::makeDirectory($dir);
        if ($overwrite) {
            self::clearMediaAssets($dir, $uuid);
        }
        $stored = self::storeImage($file, $uuid, $dir, $userId);
        return self::mediaUrl($userId, 'template', $uuid, $stored['extension']);
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
        return \APP_URL
            . '/assets/users/' . $userId
            . '/videos/' . $uuid . '_preview.jpg';
    }
}
class PostTags
{
    public static function names(int $postId): array
    {
        $rows = Query::fetchAll(
            'SELECT t.name
            FROM ielectro_dyscover.dyscover_post_tags pt
            INNER JOIN ielectro_dyscover.dyscover_tags t ON t.id = pt.tag_id
            WHERE pt.post_id = ?
            ORDER BY t.name',
            [$postId]
        );
        return array_column($rows, 'name');
    }
    public static function mapForPosts(array $postIds): array
    {
        $postIds = array_values(array_filter(array_map('intval', $postIds)));
        if (!$postIds) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($postIds), '?'));
        $rows = Query::fetchAll(
            "SELECT pt.post_id, t.name
            FROM ielectro_dyscover.dyscover_post_tags pt
            INNER JOIN ielectro_dyscover.dyscover_tags t ON t.id = pt.tag_id
            WHERE pt.post_id IN ({$placeholders})
            ORDER BY t.name",
            $postIds
        );
        $map = [];
        foreach ($rows as $row) {
            $map[(int) $row['post_id']][] = (string) $row['name'];
        }
        return $map;
    }
    public static function sync(int $postId, mixed $input): void
    {
        $names = self::parse($input);
        Query::execute('DELETE FROM ielectro_dyscover.dyscover_post_tags WHERE post_id = ?', [$postId]);
        foreach ($names as $name) {
            $tagId = self::ensure($name);
            Query::execute(
                'INSERT IGNORE INTO ielectro_dyscover.dyscover_post_tags(post_id, tag_id) VALUES(?, ?)',
                [$postId, $tagId]
            );
        }
    }
    public static function parse(mixed $input): array
    {
        if (is_string($input)) {
            $trimmed = trim($input);
            if ($trimmed !== '' && str_starts_with($trimmed, '[')) {
                $decoded = json_decode($trimmed, true);
                if (is_array($decoded)) {
                    $input = $decoded;
                }
            }
        }
        if (is_array($input)) {
            $names = [];
            foreach ($input as $value) {
                $name = self::normalize((string) $value);
                if ($name !== '') {
                    $names[] = $name;
                }
            }
            return array_values(array_unique($names));
        }
        $text = trim((string) $input);
        if ($text === '') {
            return [];
        }
        if (preg_match_all('/#([\p{L}\p{N}_-]+)/u', $text, $matches)) {
            $names = array_map(
                static fn(string $name): string => self::normalize($name),
                $matches[1]
            );
            return array_values(array_unique(array_filter($names)));
        }
        $parts = preg_split('/[\s,]+/', $text) ?: [];
        $names = [];
        foreach ($parts as $part) {
            $name = self::normalize($part);
            if ($name !== '') {
                $names[] = $name;
            }
        }
        return array_values(array_unique($names));
    }
    public static function suggest(string $term, int $limit = 8): array
    {
        $term = self::normalize($term);
        if ($term === '') {
            return [];
        }
        $rows = Query::fetchAll(
            'SELECT name
            FROM ielectro_dyscover.dyscover_tags
            WHERE name LIKE ?
            ORDER BY name
            LIMIT ' . (int) $limit,
            [$term . '%']
        );
        return array_column($rows, 'name');
    }
    private static function normalize(string $name): string
    {
        $name = trim($name);
        $name = ltrim($name, '#');
        return mb_strtolower($name);
    }
    private static function ensure(string $name): int
    {
        $row = Query::fetch(
            'SELECT id FROM ielectro_dyscover.dyscover_tags WHERE name = ? LIMIT 1',
            [$name]
        );
        if ($row) {
            return (int) $row['id'];
        }
        Query::execute('INSERT INTO ielectro_dyscover.dyscover_tags(name) VALUES(?)', [$name]);
        return Query::lastId();
    }
}
