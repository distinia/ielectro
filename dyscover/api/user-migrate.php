<?php
namespace Dyscover;

use Nesh\App;
use Nesh\File;
use Nesh\Generate;
use Nesh\Query;
use Nesh\Schema;
use Nesh\Validate;
use Nesh\Video;

final class UserMigrate
{
    private const POST_FOLDERS = [
        'articles' => 'article',
        'images' => 'image',
        'videos' => 'video',
        'audios' => 'audio',
        'documents' => 'document',
    ];

    private const TAG_HINTS = [
        'map', 'flag', 'emblem', 'anthem', 'president', 'minister', 'prime',
        'government', 'country', 'party', 'agency', 'military', 'conflict',
        'community', 'union', 'constitution', 'law', 'police', 'navy', 'army',
    ];

    private const STOP_WORDS = [
        'the', 'and', 'for', 'with', 'from', 'into', 'of', 'in', 'on', 'at',
        'to', 'a', 'an', 'by', 'or',
    ];

    private int $userId;
    private string $sourceRoot;
    private string $targetRoot;

    /** @var array<string, int> */
    private array $counts = [
        'posts' => 0,
        'templates' => 0,
        'fields' => 0,
        'tags' => 0,
        'renamed' => 0,
        'deleted_json' => 0,
    ];

    /** @var array<string, int> */
    private array $postsByType = [];

    public function __construct(int $userId)
    {
        if ($userId <= 0) {
            throw new \InvalidArgumentException('Invalid user id');
        }

        $app = App::get('dyscover');
        if ($app === null) {
            throw new \RuntimeException('Dyscover application is not configured');
        }

        if (!defined('APP_URL')) {
            define('APP_URL', $app->url);
        }
        if (!defined('APP_ASSETS')) {
            define('APP_ASSETS', $app->paths['assets']);
        }

        $this->userId = $userId;
        $this->sourceRoot = self::resolveSourceRoot($userId);
        $this->targetRoot = $app->paths['assets'] . '/users/' . $userId;

        File::makeDirectory($this->targetRoot);
    }

    /** @return array<string, int|string> */
    public function run(): array
    {
        $this->assertUserExists();

        foreach (self::POST_FOLDERS as $folder => $type) {
            $this->migrateFolder($folder, $type);
        }

        $this->migrateTemplates();

        return [
            'user_id' => $this->userId,
            'source' => $this->sourceRoot,
            'posts' => $this->counts['posts'],
            'posts_by_type' => $this->postsByType,
            'templates' => $this->counts['templates'],
            'fields' => $this->counts['fields'],
            'tags' => $this->counts['tags'],
            'renamed' => $this->counts['renamed'],
            'deleted_json' => $this->counts['deleted_json'],
        ];
    }

    private static function resolveSourceRoot(int $userId): string
    {
        $candidates = [
            ROOT_PATH . '/dyscover/assets/users/' . $userId,
            ROOT_PATH . '/dyscover/assets/user' . $userId,
        ];

        foreach ($candidates as $path) {
            if (is_dir($path)) {
                return $path;
            }
        }

        throw new \RuntimeException(
            'No legacy asset directory found for user ' . $userId
        );
    }

    private function assertUserExists(): void
    {
        $row = Query::fetch(
            'SELECT id FROM ' . Schema::DYSCOVER_USERS . ' WHERE id = ? LIMIT 1',
            [$this->userId]
        );

        if (!$row) {
            throw new \RuntimeException(
                'Dyscover user ' . $this->userId . ' was not found in the database'
            );
        }
    }

    private function migrateFolder(string $folder, string $type): void
    {
        $directory = $this->sourceRoot . '/' . $folder;
        if (!is_dir($directory)) {
            return;
        }

        $extensions = $type === 'article'
            ? ['php', 'html']
            : null;

        foreach ($this->legacyFiles($directory, $extensions) as $filePath) {
            $this->migratePostFile($filePath, $type);
        }
    }

    private function migratePostFile(string $filePath, string $type): void
    {
        $basename = pathinfo($filePath, PATHINFO_FILENAME);
        $title = self::humanize($basename);

        if ($this->postExists($title, $type)) {
            return;
        }

        $uuid = Generate::uuid();
        $description = $title;
        $tags = self::generateTags($title, $type);

        $connection = \Nesh\Database::start();
        mysqli_begin_transaction($connection);

        try {
            Query::execute(
                'INSERT INTO ' . Schema::DYSCOVER_POSTS . '(
                    user_id, uuid, type, title, description,
                    extension, preview_image, visibility, allow_comments, status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $this->userId,
                    $uuid,
                    $type,
                    $title,
                    $description,
                    '',
                    PostAssets::defaultPreview(),
                    'public',
                    1,
                    'active',
                ]
            );

            $postId = Query::lastId();
            Query::execute(
                'INSERT INTO ' . Schema::DYSCOVER_POST_STATISTICS . '(post_id) VALUES(?)',
                [$postId]
            );

            PostTags::sync($postId, $tags);
            PostMentions::sync($postId, $description, $this->userId);

            mysqli_commit($connection);
        } catch (\Throwable $exception) {
            mysqli_rollback($connection);
            throw new \RuntimeException(
                'Failed to migrate ' . basename($filePath) . ': ' . $exception->getMessage(),
                0,
                $exception
            );
        }

        try {
            $media = $type === 'article'
                ? $this->prepareArticle($filePath, $uuid)
                : $this->prepareMedia($filePath, $type, $uuid);

            Query::execute(
                'UPDATE ' . Schema::DYSCOVER_POSTS . '
                SET extension = ?, preview_image = ?
                WHERE id = ?',
                [$media['extension'], $media['preview_image'], $postId]
            );
        } catch (\Throwable $exception) {
            Query::execute('DELETE FROM ' . Schema::DYSCOVER_POSTS . ' WHERE id = ?', [$postId]);
            throw new \RuntimeException(
                'Failed to migrate ' . basename($filePath) . ': ' . $exception->getMessage(),
                0,
                $exception
            );
        }

        $this->counts['posts']++;
        $this->postsByType[$type] = ($this->postsByType[$type] ?? 0) + 1;
        $this->counts['tags'] += count($tags);
        if ($media['renamed']) {
            $this->counts['renamed']++;
        }
    }

    /** @return array{extension: string, preview_image: string, renamed: bool} */
    private function prepareArticle(string $filePath, string $uuid): array
    {
        $content = (string) file_get_contents($filePath);
        if ($content === '') {
            throw new \RuntimeException('Article file is empty');
        }

        PostAssets::saveArticle(
            $this->userId,
            $uuid,
            self::extractArticleHtml($content)
        );

        if (!unlink($filePath)) {
            throw new \RuntimeException('Unable to remove legacy article file');
        }

        return [
            'extension' => 'html',
            'preview_image' => PostAssets::defaultPreview(),
            'renamed' => true,
        ];
    }

    /** @return array{extension: string, preview_image: string, renamed: bool} */
    private function prepareMedia(string $filePath, string $type, string $uuid): array
    {
        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $destDir = PostAssets::mediaDir($this->userId, $type);
        File::makeDirectory($destDir);
        $destPath = $destDir . '/' . $uuid . '.' . $extension;

        if (!File::movePath($filePath, $destPath, false)) {
            throw new \RuntimeException('Unable to rename media file');
        }

        $previewImage = PostAssets::defaultPreview();
        if ($type === 'image') {
            $previewImage = PostAssets::mediaUrl(
                $this->userId,
                $type,
                $uuid,
                $extension
            );
        } elseif ($type === 'video') {
            $previewImage = $this->videoPreview($destPath, $uuid) ?: $previewImage;
        }

        return [
            'extension' => $extension,
            'preview_image' => $previewImage,
            'renamed' => true,
        ];
    }

    private function migrateTemplates(): void
    {
        $directory = $this->sourceRoot . '/templates';
        if (!is_dir($directory)) {
            return;
        }

        foreach ($this->legacyFiles($directory, ['json']) as $jsonPath) {
            $this->migrateTemplate($jsonPath);
        }
    }

    private function migrateTemplate(string $jsonPath): void
    {
        $basename = pathinfo($jsonPath, PATHINFO_FILENAME);
        $title = self::humanize($basename);

        if ($this->postExists($title, 'template')) {
            return;
        }

        $description = $title;
        $raw = json_decode((string) file_get_contents($jsonPath), true);
        if (!is_array($raw)) {
            throw new \RuntimeException('Invalid template JSON: ' . basename($jsonPath));
        }

        $fields = self::normalizeTemplateFields($raw);
        if (!$fields) {
            throw new \RuntimeException('Template has no valid fields: ' . basename($jsonPath));
        }

        $uuid = Generate::uuid();
        $tags = self::generateTags($title, 'template', $fields);

        $connection = \Nesh\Database::start();
        mysqli_begin_transaction($connection);

        try {
            Query::execute(
                'INSERT INTO ' . Schema::DYSCOVER_POSTS . '(
                    user_id, uuid, type, title, description,
                    extension, preview_image, visibility, allow_comments, status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $this->userId,
                    $uuid,
                    'template',
                    $title,
                    $description,
                    '',
                    PostAssets::defaultPreview(),
                    'public',
                    1,
                    'active',
                ]
            );

            $postId = Query::lastId();
            Query::execute(
                'INSERT INTO ' . Schema::DYSCOVER_POST_STATISTICS . '(post_id) VALUES(?)',
                [$postId]
            );
            TemplateFields::sync($postId, $fields);
            PostTags::sync($postId, $tags);
            PostMentions::sync($postId, $description, $this->userId);

            mysqli_commit($connection);
        } catch (\Throwable $exception) {
            mysqli_rollback($connection);
            throw new \RuntimeException(
                'Failed to migrate template ' . basename($jsonPath) . ': '
                . $exception->getMessage(),
                0,
                $exception
            );
        }

        try {
            $previewImage = $this->migrateTemplatePreview($basename, $uuid)
                ?: PostAssets::defaultPreview();

            if ($previewImage !== PostAssets::defaultPreview()) {
                Query::execute(
                    'UPDATE ' . Schema::DYSCOVER_POSTS . ' SET preview_image = ? WHERE id = ?',
                    [$previewImage, $postId]
                );
            }

            if (!unlink($jsonPath)) {
                throw new \RuntimeException('Unable to delete template JSON');
            }
        } catch (\Throwable $exception) {
            Query::execute('DELETE FROM ' . Schema::DYSCOVER_POSTS . ' WHERE id = ?', [$postId]);
            throw new \RuntimeException(
                'Failed to migrate template ' . basename($jsonPath) . ': '
                . $exception->getMessage(),
                0,
                $exception
            );
        }

        $this->counts['templates']++;
        $this->counts['posts']++;
        $this->counts['fields'] += count($fields);
        $this->counts['tags'] += count($tags);
        $this->counts['deleted_json']++;
        $this->postsByType['template'] = ($this->postsByType['template'] ?? 0) + 1;
    }

    private function postExists(string $title, string $type): bool
    {
        $row = Query::fetch(
            'SELECT id FROM ' . Schema::DYSCOVER_POSTS . '
            WHERE user_id = ? AND type = ? AND title = ?
            LIMIT 1',
            [$this->userId, $type, $title]
        );

        return $row !== null;
    }

    private function migrateTemplatePreview(string $basename, string $uuid): string
    {
        $directory = PostAssets::mediaDir($this->userId, 'template');
        File::makeDirectory($directory);

        foreach (['png', 'jpg', 'jpeg', 'webp', 'gif'] as $extension) {
            $legacyPath = $this->sourceRoot . '/templates/' . $basename . '.' . $extension;
            if (!is_file($legacyPath)) {
                continue;
            }

            $destPath = $directory . '/' . $uuid . '.' . $extension;
            if (!File::movePath($legacyPath, $destPath, false)) {
                throw new \RuntimeException('Unable to rename template preview');
            }

            $this->counts['renamed']++;
            return PostAssets::mediaUrl(
                $this->userId,
                'template',
                $uuid,
                $extension
            );
        }

        return '';
    }

    private function videoPreview(string $videoPath, string $uuid): string
    {
        if (!PostAssets::ffmpegReady()) {
            return '';
        }

        try {
            $video = Video::open($videoPath);
            $video->thumbnail();
            $thumbPath = $video->thumbnailPath();
            if ($thumbPath === null || !is_file($thumbPath)) {
                return '';
            }

            $previewPath = PostAssets::mediaDir($this->userId, 'video')
                . '/' . $uuid . '_preview.jpg';
            File::makeDirectory(dirname($previewPath));

            if (!File::copyPath($thumbPath, $previewPath, true)) {
                return '';
            }

            if (is_file($thumbPath)) {
                unlink($thumbPath);
            }

            return \APP_URL
                . '/assets/users/' . $this->userId
                . '/videos/' . $uuid . '_preview.jpg';
        } catch (\Throwable) {
            return '';
        }
    }

    /** @return list<string> */
    private function legacyFiles(string $directory, ?array $extensions = null): array
    {
        $files = [];
        $iterator = new \DirectoryIterator($directory);

        foreach ($iterator as $item) {
            if ($item->isDot() || !$item->isFile()) {
                continue;
            }

            $filename = $item->getFilename();
            if ($filename === 'avatar.png') {
                continue;
            }

            $extension = strtolower($item->getExtension());
            if ($extensions !== null && !in_array($extension, $extensions, true)) {
                continue;
            }

            $basename = $item->getBasename('.' . $item->getExtension());
            if (Validate::uuid(strtolower($basename))) {
                continue;
            }

            $files[] = $item->getPathname();
        }

        sort($files, SORT_NATURAL | SORT_FLAG_CASE);
        return $files;
    }

    public static function humanize(string $value): string
    {
        $value = trim($value);
        $value = preg_replace('/\.[^.]+$/', '', $value) ?? $value;
        $value = str_replace(['_', '-'], ' ', $value);
        $value = preg_replace('/\s+/', ' ', $value) ?? $value;
        return trim($value);
    }

    public static function extractArticleHtml(string $content): string
    {
        if (preg_match(
            '/<aside[^>]*class="[^"]*article-main-content[^"]*"[^>]*>(.*)<\/aside>/is',
            $content,
            $matches
        )) {
            return trim($matches[1]);
        }

        if (preg_match('/<body[^>]*>(.*)<\/body>/is', $content, $matches)) {
            return trim($matches[1]);
        }

        return trim($content);
    }

    /** @return list<array{name: string, type: string}> */
    public static function normalizeTemplateFields(array $raw): array
    {
        $fields = [];
        $allowed = [
            'single-image', 'large-image', 'double-image', 'definition', 'text',
            'double-column', 'double-column-extended',
        ];

        foreach ($raw as $field) {
            if (!is_array($field)) {
                continue;
            }

            $name = trim((string) ($field['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $type = strtolower(str_replace(' ', '-', trim((string) ($field['type'] ?? 'text'))));
            if ($type === 'image') {
                $type = 'single-image';
            }
            $lowerName = mb_strtolower($name);
            if (preg_match('/(^|\s)logo(\s|$)/u', $lowerName)) {
                $type = 'single-image';
            } elseif (preg_match('/(^|\s)map(\s|$)/u', $lowerName)) {
                $type = 'large-image';
            }
            if (!in_array($type, $allowed, true)) {
                $type = 'text';
            }

            $fields[] = [
                'name' => $name,
                'type' => $type,
            ];
        }

        return $fields;
    }

    /** @param list<array{name: string, type: string}> $fields */
    public static function generateTags(
        string $title,
        string $type,
        array $fields = []
    ): array {
        $tags = [$type];
        $lowerTitle = mb_strtolower($title);

        foreach (preg_split('/\s+/', $lowerTitle) ?: [] as $word) {
            if (count($tags) >= 5) {
                break;
            }

            $word = preg_replace('/[^a-z0-9_-]/u', '', $word) ?? '';
            if ($word === '' || strlen($word) < 3 || in_array($word, self::STOP_WORDS, true)) {
                continue;
            }
            if (!in_array($word, $tags, true)) {
                $tags[] = $word;
            }
        }

        foreach (self::TAG_HINTS as $hint) {
            if (count($tags) >= 5) {
                break;
            }
            if (str_contains($lowerTitle, $hint) && !in_array($hint, $tags, true)) {
                $tags[] = $hint;
            }
        }

        foreach ($fields as $field) {
            if (count($tags) >= 5) {
                break;
            }
            $name = mb_strtolower((string) ($field['name'] ?? ''));
            foreach (preg_split('/\s+/', $name) ?: [] as $word) {
                if (count($tags) >= 5) {
                    break 2;
                }
                $word = preg_replace('/[^a-z0-9_-]/u', '', $word) ?? '';
                if ($word === '' || strlen($word) < 3 || in_array($word, self::STOP_WORDS, true)) {
                    continue;
                }
                if (!in_array($word, $tags, true)) {
                    $tags[] = $word;
                }
            }
        }

        $fallback = ['worldbuilding', 'creative', 'lore', 'fiction', 'dyscover'];
        foreach ($fallback as $word) {
            if (count($tags) >= 5) {
                break;
            }
            if (!in_array($word, $tags, true)) {
                $tags[] = $word;
            }
        }

        return array_slice(array_values(array_unique($tags)), 0, 5);
    }
}
