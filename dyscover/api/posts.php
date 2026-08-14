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
require_once __DIR__ . '/moderation.php';
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
        User::requireCanPost();
        $input = Request::body();
        $type = trim((string) ($input['type'] ?? ''));
        if (!Validate::in($type, PostData::TYPES)) {
            Response::badRequest('Invalid post type');
        }
        $title = trim((string) ($input['title'] ?? ''));
        if (!Validate::required($title)) {
            Response::badRequest('Missing title');
        }
        Moderation::assertCleanText($title);
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
        Moderation::assertCleanText($description);
        $visibility = trim((string) ($input['visibility'] ?? 'public'));
        $allowComments = PostData::parseBool($input['allow_comments'] ?? null, true);
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
            $coverFile = Request::file('media');
            if ($coverFile) {
                PostAssets::assertMediaSize('image', $coverFile);
                $previewImage = PostAssets::storeArticleCover(
                    $coverFile,
                    $userId,
                    $uuid,
                    false
                );
            }
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
            PostAssets::assertMediaSize($type, $mediaFile);
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
                extension, preview_image, visibility, allow_comments, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')",
            [
                $userId,
                $uuid,
                $type,
                $title,
                $description,
                $extension,
                $previewImage,
                $visibility,
                $allowComments ? 1 : 0,
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
            PostTags::sync($id, PostTags::validateLimit($input['tags']), [
                'type' => $type,
                'title' => $title,
                'description' => $description,
            ]);
        }
        PostMentions::sync($id, $description, $userId);
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
        User::requireCanPost();
        $post = PostData::requireOwned(Routing::id());
        $input = Request::body();
        $userId = (int) $post['user_id'];
        $uuid = (string) $post['uuid'];
        $type = (string) $post['type'];
        $postId = (int) $post['id'];
        $updated = false;
        $fields = [];
        $params = [];
        $descriptionSync = null;
        foreach (['title', 'description', 'visibility'] as $field) {
            if (!array_key_exists($field, $input)) {
                continue;
            }
            $value = trim((string) $input[$field]);
            if ($field === 'title' || $field === 'description') {
                Moderation::assertCleanText($value);
            }
            if ($field === 'description') {
                $descriptionSync = $value;
            }
            $fields[] = "{$field} = ?";
            $params[] = $value;
            $updated = true;
        }
        if ($fields) {
            $params[] = $postId;
            Query::execute(
                'UPDATE ielectro_dyscover.dyscover_posts SET ' . implode(', ', $fields) . ' WHERE id = ?',
                $params
            );
        }
        if (array_key_exists('allow_comments', $input)) {
            Query::execute(
                'UPDATE ielectro_dyscover.dyscover_posts SET allow_comments = ? WHERE id = ?',
                [PostData::parseBool($input['allow_comments'], true) ? 1 : 0, $postId]
            );
            $updated = true;
        }
        if (array_key_exists('status', $input)) {
            $status = trim((string) $input['status']);
            if (!Validate::in($status, ['active', 'hidden'])) {
                Response::badRequest('Invalid status');
            }
            Query::execute(
                'UPDATE ielectro_dyscover.dyscover_posts SET status = ? WHERE id = ?',
                [$status, $postId]
            );
            $updated = true;
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
            if ($type === 'article') {
                PostAssets::assertMediaSize('image', $mediaFile);
                $previewImage = PostAssets::storeArticleCover(
                    $mediaFile,
                    $userId,
                    $uuid,
                    true
                );
                Query::execute(
                    'UPDATE ielectro_dyscover.dyscover_posts SET preview_image = ? WHERE id = ?',
                    [$previewImage, $postId]
                );
                $updated = true;
            } elseif (PostAssets::isMediaType($type)) {
                PostAssets::assertMediaSize($type, $mediaFile);
                $processed = PostAssets::storeMedia($type, $mediaFile, $userId, $uuid, true);
                Query::execute(
                    'UPDATE ielectro_dyscover.dyscover_posts SET extension = ?, preview_image = ? WHERE id = ?',
                    [$processed['extension'], $processed['preview_image'], $postId]
                );
                $updated = true;
            } else {
                Response::badRequest('Media is only valid for media posts and articles');
            }
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
            PostTags::sync($postId, PostTags::validateLimit($input['tags']), [
                'type' => $type,
                'title' => (string) ($post['title'] ?? ''),
                'description' => array_key_exists('description', $input)
                    ? trim((string) $input['description'])
                    : (string) ($post['description'] ?? ''),
            ]);
            $updated = true;
        }
        if ($descriptionSync !== null) {
            PostMentions::sync($postId, $descriptionSync, User::id());
        }
        if (!$updated) {
            Response::badRequest('Nothing to update');
        }
        Response::success(PostData::oneOwned($postId));
    }
    private function delete(): void
    {
        Request::delete();
        User::requireCanPost();
        $post = PostData::requireOwned(Routing::id());
        $postId = (int) $post['id'];
        PostAssets::deleteForPost($post);
        Query::execute(
            'DELETE FROM ielectro_dyscover.dyscover_posts WHERE id = ?',
            [$postId]
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
        $rows = Accounts::attachUsernames([$row]);
        return self::map($rows[0]);
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
        if (!$row || !in_array($row['status'], ['active', 'hidden'], true)) {
            Response::notFound('Post not found');
        }
        if ((int) $row['user_id'] !== User::id()) {
            Response::forbidden();
        }
        return $row;
    }
    public static function oneOwned(int $id): array
    {
        if ($id <= 0) {
            Response::badRequest('Missing post id');
        }
        $row = self::fetchRow('p.id = ?', [$id]);
        if (!$row || !in_array($row['status'], ['active', 'hidden'], true)) {
            Response::notFound('Post not found');
        }
        if ((int) $row['user_id'] !== User::id()) {
            Response::forbidden();
        }
        $rows = Accounts::attachUsernames([$row]);
        return self::map($rows[0]);
    }
    public static function listByUser(int $userId, bool $includeArchived = false): array
    {
        $statusSql = $includeArchived
            ? "AND p.status IN ('active', 'hidden')"
            : "AND p.status = 'active'";
        $rows = Query::fetchAll(
            self::selectSql() . "
            WHERE p.user_id = ?
            {$statusSql}
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
            'status' => $row['status'] ?? 'active',
            'allow_comments' => (bool) ($row['allow_comments'] ?? true),
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
            'reposted' => PostEngagement::exists('ielectro_dyscover.dyscover_post_reposts', $id, $viewerId),
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
    public static function parseBool(mixed $value, bool $default = true): bool
    {
        if ($value === null || $value === '') {
            return $default;
        }
        if (is_bool($value)) {
            return $value;
        }
        $normalized = strtolower(trim((string) $value));
        return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
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
        $commentId = Routing::segment(4);
        $sub = Routing::segment(5);
        if (is_string($commentId) && ctype_digit($commentId) && $sub === 'likes') {
            (new PostCommentLikes())->index();
            return;
        }
        if (is_string($commentId) && ctype_digit($commentId)) {
            Routing::method([
                'PATCH'  => fn() => $this->update(),
                'DELETE' => fn() => $this->delete(),
            ]);
            return;
        }
        Routing::method([
            'GET'  => fn() => $this->list(),
            'POST' => fn() => $this->create(),
        ]);
    }
    private function postId(): int
    {
        $postId = Routing::id();
        if ($postId === null) {
            Response::badRequest('Missing post id');
        }
        return $postId;
    }
    private function commentId(): int
    {
        $commentId = (int) Routing::segment(4);
        if ($commentId <= 0) {
            Response::badRequest('Missing comment id');
        }
        return $commentId;
    }
    private function viewerId(): ?int
    {
        if (\Nesh\Identity::id() === null) {
            return null;
        }
        return User::id();
    }
    private function list(): void
    {
        Request::get();
        $postId = $this->postId();
        $viewerId = $this->viewerId();
        $rows = Query::fetchAll(
            "SELECT
                c.id,
                c.user_id,
                c.parent_id,
                c.body,
                c.created_at,
                du.account_id,
                (
                    SELECT COUNT(*)
                    FROM ielectro_dyscover.dyscover_post_comment_likes l
                    WHERE l.comment_id = c.id
                ) AS likes,
                " . ($viewerId !== null
                    ? "EXISTS(
                        SELECT 1
                        FROM ielectro_dyscover.dyscover_post_comment_likes l
                        WHERE l.comment_id = c.id AND l.user_id = ?
                    )"
                    : "0") . " AS liked
            FROM ielectro_dyscover.dyscover_post_comments c
            INNER JOIN ielectro_dyscover.dyscover_users du ON du.id = c.user_id
            WHERE c.post_id = ? AND c.status = 'active'
            ORDER BY c.id ASC",
            $viewerId !== null ? [$viewerId, $postId] : [$postId]
        );
        $rows = Accounts::attachUsernames($rows);
        Response::success(array_map(function (array $row) use ($viewerId): array {
            $userId = (int) $row['user_id'];
            return [
                'id' => (int) $row['id'],
                'user_id' => $userId,
                'parent_id' => isset($row['parent_id']) && $row['parent_id'] !== null
                    ? (int) $row['parent_id']
                    : null,
                'username' => $row['username'],
                'avatar' => Avatar::url($userId),
                'body' => $row['body'],
                'likes' => (int) ($row['likes'] ?? 0),
                'liked' => (bool) ($row['liked'] ?? false),
                'own' => $viewerId !== null && $userId === $viewerId,
                'created_at' => $row['created_at'],
            ];
        }, $rows));
    }
    private function create(): void
    {
        Request::post();
        User::requireCanPost();
        $postId = $this->postId();
        $post = Query::fetch(
            'SELECT allow_comments FROM ielectro_dyscover.dyscover_posts WHERE id = ? LIMIT 1',
            [$postId]
        );
        if (!$post || !(bool) ($post['allow_comments'] ?? true)) {
            Response::forbidden('Comments are disabled for this post');
        }
        $body = trim((string) Request::value('body'));
        if (!Validate::required($body)) {
            Response::badRequest('Empty comment');
        }
        Moderation::assertCleanText($body);
        $parentId = Request::value('parent_id');
        $parentId = is_numeric($parentId) ? (int) $parentId : null;
        if ($parentId !== null && $parentId <= 0) {
            $parentId = null;
        }
        if ($parentId !== null) {
            $parent = Query::fetch(
                "SELECT id FROM ielectro_dyscover.dyscover_post_comments
                WHERE id = ? AND post_id = ? AND status = 'active'
                LIMIT 1",
                [$parentId, $postId]
            );
            if (!$parent) {
                Response::badRequest('Invalid reply target');
            }
        }
        Query::execute(
            "INSERT INTO ielectro_dyscover.dyscover_post_comments(
                post_id, user_id, parent_id, body, status
            ) VALUES (?, ?, ?, ?, 'active')",
            [$postId, User::id(), $parentId, $body]
        );
        PostEngagement::adjustStatDirect('comments', $postId, 1);
        $commentId = (int) Query::lastId();
        ActivityNotify::onComment($postId, User::id());
        Response::created(['id' => $commentId]);
    }
    private function update(): void
    {
        Request::patch();
        User::requireCanPost();
        $commentId = $this->commentId();
        $body = trim((string) Request::value('body'));
        if (!Validate::required($body)) {
            Response::badRequest('Empty comment');
        }
        Moderation::assertCleanText($body);
        Query::execute(
            "UPDATE ielectro_dyscover.dyscover_post_comments
            SET body = ?
            WHERE id = ? AND user_id = ? AND status = 'active'",
            [$body, $commentId, User::id()]
        );
        Response::success('Comment updated');
    }
    private function collectDescendantIds(int $commentId, int $postId): array
    {
        $ids = [$commentId];
        $queue = [$commentId];
        while ($queue !== []) {
            $parentId = array_shift($queue);
            $children = Query::fetchAll(
                "SELECT id FROM ielectro_dyscover.dyscover_post_comments
                WHERE post_id = ? AND parent_id = ? AND status = 'active'",
                [$postId, $parentId]
            );
            foreach ($children as $child) {
                $id = (int) $child['id'];
                $ids[] = $id;
                $queue[] = $id;
            }
        }
        return $ids;
    }
    private function delete(): void
    {
        Request::delete();
        User::requireCanPost();
        $commentId = $this->commentId();
        $row = Query::fetch(
            'SELECT post_id FROM ielectro_dyscover.dyscover_post_comments
            WHERE id = ? AND user_id = ? AND status = ? LIMIT 1',
            [$commentId, User::id(), 'active']
        );
        if (!$row) {
            Response::notFound('Comment not found');
        }
        $postId = (int) $row['post_id'];
        $ids = $this->collectDescendantIds($commentId, $postId);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        Query::execute(
            "UPDATE ielectro_dyscover.dyscover_post_comments
            SET status = 'hidden'
            WHERE id IN ({$placeholders})",
            $ids
        );
        PostEngagement::adjustStatDirect('comments', $postId, -count($ids));
        Response::success(['removed' => count($ids)]);
    }
}
class PostCommentLikes
{
    public function index(): void
    {
        Routing::method([
            'POST'   => fn() => $this->add(),
            'DELETE' => fn() => $this->remove(),
        ]);
    }
    private function postId(): int
    {
        $postId = Routing::id();
        if ($postId === null) {
            Response::badRequest('Missing post id');
        }
        return $postId;
    }
    private function commentId(): int
    {
        $commentId = (int) Routing::segment(4);
        if ($commentId <= 0) {
            Response::badRequest('Missing comment id');
        }
        return $commentId;
    }
    private function assertComment(int $commentId, int $postId): void
    {
        if (!Query::exists(
            "SELECT 1 FROM ielectro_dyscover.dyscover_post_comments
            WHERE id = ? AND post_id = ? AND status = 'active' LIMIT 1",
            [$commentId, $postId]
        )) {
            Response::notFound('Comment not found');
        }
    }
    private function add(): void
    {
        Request::post();
        $postId = $this->postId();
        $commentId = $this->commentId();
        $this->assertComment($commentId, $postId);
        Query::execute(
            'INSERT IGNORE INTO ielectro_dyscover.dyscover_post_comment_likes(comment_id, user_id)
            VALUES (?, ?)',
            [$commentId, User::id()]
        );
        Response::created('Liked');
    }
    private function remove(): void
    {
        Request::delete();
        $postId = $this->postId();
        $commentId = $this->commentId();
        $this->assertComment($commentId, $postId);
        Query::execute(
            'DELETE FROM ielectro_dyscover.dyscover_post_comment_likes
            WHERE comment_id = ? AND user_id = ?',
            [$commentId, User::id()]
        );
        Response::success('Unliked');
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
    public static function mediaMaxSize(string $type): int
    {
        return match ($type) {
            'image' => defined('UPLOAD_IMAGE_MAX_SIZE')
                ? (int) UPLOAD_IMAGE_MAX_SIZE
                : 10485760,
            'document' => defined('UPLOAD_DOCUMENT_MAX_SIZE')
                ? (int) UPLOAD_DOCUMENT_MAX_SIZE
                : 52428800,
            default => defined('UPLOAD_MAX_SIZE')
                ? (int) UPLOAD_MAX_SIZE
                : 262144000,
        };
    }
    public static function assertMediaSize(string $type, array $file): void
    {
        $max = self::mediaMaxSize($type);
        $size = (int) ($file['size'] ?? 0);
        if ($size <= 0 || $size <= $max) {
            return;
        }
        Response::badRequest(
            'File exceeds maximum size of '
            . (int) round($max / 1048576)
            . ' MB'
        );
    }
    public static function ffmpegReady(): bool
    {
        exec('ffmpeg -version', $output, $code);
        return $code === 0;
    }
    public static function assetFolder(string $type): string
    {
        return self::ASSET_FOLDERS[$type] ?? $type;
    }
    public static function requireUuid(mixed $value): string
    {
        $uuid = strtolower(trim((string) $value));
        if (!Validate::uuid($uuid)) {
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
        $html = self::normalizeArticleHtml($html);
        if (file_put_contents($path, $html) === false) {
            Response::error('Unable to save article');
        }
    }
    public static function normalizeArticleHtml(string $html): string
    {
        $html = preg_replace(
            '/(<th\b[^>]*\bcolspan="2"[^>]*)\sstyle="text-align:\s*left;?"([^>]*>)/i',
            '$1$2',
            $html
        ) ?? $html;
        $html = preg_replace(
            '/(<th\b[^>]*)\sstyle="text-align:\s*left;?"(\s[^>]*\bcolspan="2"[^>]*>)/i',
            '$1$2',
            $html
        ) ?? $html;
        return self::syncTemplateImageClasses($html);
    }
    public static function syncTemplateImageClasses(string $html): string
    {
        return preg_replace_callback(
            '/(<table\b(?=[^>]*\bclass="[^"]*\btemplate\b)[^>]*\bdata-template="(\d+)"[^>]*>)([\s\S]*?)(<\/table>)/i',
            static function (array $match): string {
                $fields = self::templateFieldMap((int) $match[2]);
                if (!$fields) {
                    return $match[0];
                }
                $body = preg_replace_callback(
                    '/(<tr\b[^>]*\bdata-field="([^"]+)"[^>]*>)([\s\S]*?)(<\/tr>)/i',
                    static function (array $rowMatch) use ($fields): string {
                        $field = $fields[$rowMatch[2]] ?? null;
                        if ($field === null) {
                            return $rowMatch[0];
                        }
                        $large = $field === 'large-image';
                        $single = $field === 'single-image';
                        if (!$large && !$single) {
                            return $rowMatch[0];
                        }
                        return self::fixTemplateRowImageClasses($rowMatch[0], $large);
                    },
                    $match[3]
                ) ?? $match[3];
                return $match[1] . $body . $match[4];
            },
            $html
        ) ?? $html;
    }
    /** @return array<string, string> */
    private static function templateFieldMap(int $templateId): array
    {
        if ($templateId <= 0) {
            return [];
        }
        $rows = Query::fetchAll(
            'SELECT name, type
            FROM ielectro_dyscover.dyscover_template_fields
            WHERE template_id = ?
            ORDER BY position ASC',
            [$templateId]
        );
        $fields = [];
        foreach ($rows as $row) {
            $name = trim((string) ($row['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $slug = self::templateFieldSlug($name);
            $fields[$slug] = self::normalizeTemplateFieldType(
                $name,
                (string) ($row['type'] ?? 'text')
            );
        }
        return $fields;
    }
    private static function templateFieldSlug(string $name): string
    {
        $slug = mb_strtolower($name);
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? $slug;
        return trim($slug, '-');
    }
    private static function normalizeTemplateFieldType(string $name, string $type): string
    {
        $type = str_replace('_', '-', strtolower(trim($type)));
        if ($type === 'image') {
            $type = 'single-image';
        }
        $lowerName = mb_strtolower($name);
        if (preg_match('/(^|\s)logo(\s|$)/u', $lowerName)) {
            return 'single-image';
        }
        if (preg_match('/(^|\s)map(\s|$)/u', $lowerName)) {
            return 'large-image';
        }
        return $type;
    }
    private static function fixTemplateRowImageClasses(string $rowHtml, bool $large): string
    {
        return preg_replace_callback(
            '/(<img\b)([^>]*>)/i',
            static function (array $imgMatch) use ($large): string {
                $attrs = $imgMatch[2];
                if (
                    preg_match('/\bclass="([^"]*)"/i', $attrs, $classMatch)
                ) {
                    $classes = preg_split('/\s+/', trim($classMatch[1])) ?: [];
                    if (
                        in_array('template-first-image', $classes, true)
                        || in_array('template-second-image', $classes, true)
                    ) {
                        return $imgMatch[0];
                    }
                    $classes = array_values(array_diff($classes, [
                        'template-image',
                        'template-large-image',
                        'template-single-image',
                    ]));
                    $classes[] = $large ? 'template-large-image' : 'template-single-image';
                    $attrs = preg_replace(
                        '/\bclass="[^"]*"/i',
                        'class="' . trim(implode(' ', array_unique($classes))) . '"',
                        $attrs,
                        1
                    ) ?? $attrs;
                }
                $attrs = preg_replace('/\sstyle="[^"]*\bwidth\s*:[^"]*"/i', '', $attrs) ?? $attrs;
                return $imgMatch[1] . $attrs;
            },
            $rowHtml
        ) ?? $rowHtml;
    }
    public static function deleteForPost(array $post): void
    {
        $userId = (int) ($post['user_id'] ?? 0);
        $uuid = trim((string) ($post['uuid'] ?? ''));
        $type = trim((string) ($post['type'] ?? ''));
        if ($userId <= 0 || $uuid === '') {
            return;
        }
        match ($type) {
            'article' => self::deleteArticleAssets($userId, $uuid),
            'template' => self::clearMediaAssets(self::mediaDir($userId, 'template'), $uuid),
            'image', 'video', 'audio', 'document' => self::clearMediaAssets(
                self::mediaDir($userId, $type),
                $uuid
            ),
            default => null,
        };
    }
    private static function deleteArticleAssets(int $userId, string $uuid): void
    {
        $path = self::articlePath($userId, $uuid);
        if (is_file($path)) {
            unlink($path);
        }
        $dir = self::mediaDir($userId, 'article');
        foreach (glob($dir . '/' . $uuid . '_cover.*') ?: [] as $coverPath) {
            if (is_file($coverPath)) {
                unlink($coverPath);
            }
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
    public static function storeArticleCover(
        array $file,
        int $userId,
        string $uuid,
        bool $overwrite
    ): string {
        $dir = self::mediaDir($userId, 'article');
        File::makeDirectory($dir);
        if ($overwrite) {
            foreach (glob($dir . '/' . $uuid . '_cover.*') ?: [] as $path) {
                if (is_file($path)) {
                    unlink($path);
                }
            }
        }
        $image = Image::uploadTo($file, $dir, $uuid . '_cover', true);
        $extension = $image->extension() ?? 'jpg';
        return self::mediaUrl($userId, 'article', $uuid . '_cover', $extension);
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
        $image = Image::uploadTo($file, $dir, $uuid, true);
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
        $video = Video::uploadTo($file, $dir, $uuid, true);
        $extension = $video->extension() ?? 'mp4';
        $previewImage = self::ffmpegReady()
            ? self::saveVideoPreview($video, $dir, $uuid, $userId)
            : self::defaultPreview();
        return [
            'extension' => $extension,
            'preview_image' => $previewImage !== '' ? $previewImage : self::defaultPreview(),
        ];
    }
    private static function storeAudio(array $file, string $uuid, string $dir): array
    {
        $audio = Audio::uploadTo($file, $dir, $uuid, true);
        return [
            'extension' => $audio->extension() ?? 'mp3',
            'preview_image' => '',
        ];
    }
    private static function storeDocument(array $file, string $uuid, string $dir): array
    {
        $pdf = Pdf::uploadTo($file, $dir, $uuid, true);
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
        try {
            $video->thumbnail();
        } catch (\Throwable) {
            return '';
        }
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
    public const MAX = 5;
    private const LOW_PRIORITY = [
        'creative',
        'lore',
        'worldbuilding',
        'article',
    ];
    private const HIGH_PRIORITY = [
        'politicalparty',
        'massorganization',
        'revolutionaries',
        'politics',
        'government',
        'organizations',
        'party',
        'cabinet',
        'president',
        'statesman',
        'office',
        'primeminister',
        'minister',
        'military',
        'armedforces',
        'lawenforcement',
        'police',
        'portrait',
        'flag',
        'emblem',
        'map',
        'anthem',
        'symbol',
        'community',
        'document',
        'template',
        'destenia',
        'fesia',
        'edrobean',
        'agaritia',
        'kashiria',
        'lamberia',
        'jarnovia',
        'comussania',
        'cusea',
        'ricene',
        'valmirica',
        'verdania',
        'boravia',
        'alveria',
    ];
    public static function validateLimit(mixed $input): array
    {
        $names = self::parse($input);
        if (count($names) > self::MAX) {
            Response::badRequest('Maximum ' . self::MAX . ' tags allowed');
        }
        return $names;
    }
    public static function rank(array $tags, array $post = []): array
    {
        $tags = array_values(array_unique(array_filter(array_map(
            static fn($tag): string => self::normalize((string) $tag),
            $tags
        ))));
        if ($tags === []) {
            return [];
        }
        $scored = [];
        foreach ($tags as $tag) {
            $scored[] = [
                'tag' => $tag,
                'score' => self::scoreTag($tag, $post),
            ];
        }
        usort(
            $scored,
            static function (array $a, array $b): int {
                $score = ($b['score'] ?? 0) <=> ($a['score'] ?? 0);
                if ($score !== 0) {
                    return $score;
                }
                return strcmp((string) $a['tag'], (string) $b['tag']);
            }
        );
        $positive = array_values(array_filter(
            $scored,
            static fn(array $item): bool => (int) ($item['score'] ?? 0) > 0
        ));
        if ($positive !== []) {
            return array_slice(array_column($positive, 'tag'), 0, self::MAX);
        }
        return array_slice(array_column($scored, 'tag'), 0, self::MAX);
    }
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
    public static function sync(int $postId, mixed $input, ?array $post = null): void
    {
        $names = self::parse($input);
        if (count($names) > self::MAX) {
            if ($post === null) {
                $post = self::postContext($postId);
            }
            $names = self::rank($names, $post);
        }
        Query::execute('DELETE FROM ielectro_dyscover.dyscover_post_tags WHERE post_id = ?', [$postId]);
        foreach ($names as $name) {
            $tagId = self::ensure($name);
            Query::execute(
                'INSERT IGNORE INTO ielectro_dyscover.dyscover_post_tags(post_id, tag_id) VALUES(?, ?)',
                [$postId, $tagId]
            );
        }
    }
    public static function merge(int $postId, mixed $input, ?array $post = null): void
    {
        if ($post === null) {
            $post = self::postContext($postId);
        }
        $names = array_values(array_unique(array_merge(self::names($postId), self::parse($input))));
        self::sync($postId, self::rank($names, $post), $post);
    }
    public static function pruneUnused(): int
    {
        return Query::execute(
            'DELETE FROM ielectro_dyscover.dyscover_tags
            WHERE id NOT IN (
                SELECT tag_id FROM (
                    SELECT DISTINCT tag_id FROM ielectro_dyscover.dyscover_post_tags
                ) used
            )'
        );
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
    private static function postContext(int $postId): array
    {
        $row = Query::fetch(
            'SELECT type, title, description
            FROM ielectro_dyscover.dyscover_posts
            WHERE id = ?
            LIMIT 1',
            [$postId]
        );
        return is_array($row) ? $row : [];
    }
    private static function scoreTag(string $tag, array $post): int
    {
        $title = mb_strtolower(trim((string) ($post['title'] ?? '')));
        $description = mb_strtolower(trim((string) ($post['description'] ?? '')));
        $type = (string) ($post['type'] ?? '');
        $text = $title . ' ' . $description;
        $score = 0;
        if (in_array($tag, self::LOW_PRIORITY, true)) {
            $score -= 50;
        }
        if (in_array($tag, self::HIGH_PRIORITY, true)) {
            $score += 35;
        }
        if ($tag === $type) {
            $score += 25;
        }
        if (str_contains($text, $tag)) {
            $score += 40;
        }
        foreach (preg_split('/\s+/u', $title) ?: [] as $word) {
            $word = preg_replace('/[^a-z0-9]+/i', '', $word) ?? '';
            if ($word === '' || strlen($word) < 4) {
                continue;
            }
            if ($tag === $word || str_contains($tag, $word) || str_contains($word, $tag)) {
                $score += 20;
            }
        }
        $titleSlug = preg_replace('/[^a-z0-9]+/i', '', $title) ?? '';
        if ($tag === $titleSlug && strlen($tag) > 12) {
            $score -= 30;
        }
        if (strlen($tag) > 18) {
            $score -= 15;
        }
        return $score;
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
class PostMentions
{
    public static function parse(string $text): array
    {
        if ($text === '') {
            return [];
        }
        if (!preg_match_all('/@([a-zA-Z0-9_]{2,32})/', $text, $matches)) {
            return [];
        }
        return array_values(array_unique($matches[1]));
    }
    public static function dyscoverUserIdForUsername(string $username): ?int
    {
        $account = Accounts::findByUsername($username);
        if (!$account) {
            return null;
        }
        $row = Query::fetch(
            'SELECT id FROM ielectro_dyscover.dyscover_users WHERE account_id = ? LIMIT 1',
            [(int) $account['id']]
        );
        return $row ? (int) $row['id'] : null;
    }
    public static function sync(int $postId, string $description, int $actorId): void
    {
        $newUserIds = [];
        foreach (self::parse($description) as $username) {
            $userId = self::dyscoverUserIdForUsername($username);
            if ($userId !== null && $userId > 0) {
                $newUserIds[] = $userId;
            }
        }
        $newUserIds = array_values(array_unique($newUserIds));
        $existingRows = Query::fetchAll(
            'SELECT user_id FROM ielectro_dyscover.dyscover_post_mentions WHERE post_id = ?',
            [$postId]
        );
        $existingUserIds = array_map(
            static fn(array $row): int => (int) $row['user_id'],
            $existingRows
        );
        Query::execute(
            'DELETE FROM ielectro_dyscover.dyscover_post_mentions WHERE post_id = ?',
            [$postId]
        );
        foreach ($newUserIds as $userId) {
            Query::execute(
                'INSERT IGNORE INTO ielectro_dyscover.dyscover_post_mentions(post_id, user_id) VALUES(?, ?)',
                [$postId, $userId]
            );
        }
        foreach (array_diff($newUserIds, $existingUserIds) as $userId) {
            ActivityNotify::onMention($postId, $actorId, $userId);
        }
    }
    public static function rewriteUsername(string $oldUsername, string $newUsername): void
    {
        $oldUsername = trim($oldUsername);
        $newUsername = trim($newUsername);
        if (
            $oldUsername === ''
            || $newUsername === ''
            || strcasecmp($oldUsername, $newUsername) === 0
        ) {
            return;
        }
        $pattern = '/@' . preg_quote($oldUsername, '/') . '(?![a-zA-Z0-9_])/i';
        $replace = static function (string $text) use ($pattern, $newUsername): string {
            return preg_replace($pattern, '@' . $newUsername, $text) ?? $text;
        };
        $like = '%@' . $oldUsername . '%';
        $posts = Query::fetchAll(
            "SELECT id, description
            FROM ielectro_dyscover.dyscover_posts
            WHERE description LIKE ? AND status = 'active'",
            [$like]
        );
        foreach ($posts as $post) {
            $description = (string) $post['description'];
            $updated = $replace($description);
            if ($updated !== $description) {
                Query::execute(
                    'UPDATE ielectro_dyscover.dyscover_posts SET description = ? WHERE id = ?',
                    [$updated, (int) $post['id']]
                );
            }
        }
        $comments = Query::fetchAll(
            "SELECT id, body
            FROM ielectro_dyscover.dyscover_post_comments
            WHERE body LIKE ? AND status = 'active'",
            [$like]
        );
        foreach ($comments as $comment) {
            $body = (string) $comment['body'];
            $updated = $replace($body);
            if ($updated !== $body) {
                Query::execute(
                    'UPDATE ielectro_dyscover.dyscover_post_comments SET body = ? WHERE id = ?',
                    [$updated, (int) $comment['id']]
                );
            }
        }
        $users = Query::fetchAll(
            'SELECT id, biography FROM ielectro_dyscover.dyscover_users WHERE biography LIKE ?',
            [$like]
        );
        foreach ($users as $user) {
            $biography = (string) $user['biography'];
            $updated = $replace($biography);
            if ($updated !== $biography) {
                Query::execute(
                    'UPDATE ielectro_dyscover.dyscover_users SET biography = ? WHERE id = ?',
                    [$updated, (int) $user['id']]
                );
            }
        }
    }
}
