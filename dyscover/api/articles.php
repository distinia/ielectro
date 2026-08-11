<?php
namespace Dyscover;
use Nesh\File;
use Nesh\Identity;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
use Nesh\Validate;

require_once __DIR__ . '/posts.php';
require_once __DIR__ . '/article-content.php';

class Articles
{
    public function index(): void
    {
        if (Routing::segment(3) === 'preview') {
            Routing::method([
                'GET' => fn() => $this->preview(),
            ]);
            return;
        }
        Routing::method([
            'GET' => fn() => $this->show(),
            'PUT' => fn() => $this->update(),
        ]);
    }

    private function preview(): void
    {
        Request::get();
        $raw = trim((string) Routing::segment(2));
        if (!Validate::required($raw)) {
            Response::badRequest('Missing article uuid');
        }
        $raw = rawurldecode(strtok($raw, '#') ?: $raw);
        $post = null;
        if (Validate::uuid(strtolower($raw))) {
            $post = Query::fetch(
                "SELECT p.id, p.user_id, p.uuid, p.title, p.description, p.preview_image, p.status
                FROM ielectro_dyscover.dyscover_posts p
                WHERE p.uuid = ?
                AND p.type = 'article'
                AND p.status = 'active'
                AND p.visibility = 'public'
                LIMIT 1",
                [strtolower($raw)]
            );
        } else {
            $titleGuess = str_replace(['_', '-'], ' ', $raw);
            $post = Query::fetch(
                "SELECT p.id, p.user_id, p.uuid, p.title, p.description, p.preview_image, p.status
                FROM ielectro_dyscover.dyscover_posts p
                WHERE p.type = 'article'
                AND p.status = 'active'
                AND p.visibility = 'public'
                AND (
                    LOWER(p.title) = LOWER(?)
                    OR LOWER(REPLACE(p.title, ' ', '_')) = LOWER(?)
                    OR LOWER(REPLACE(p.title, ' ', '-')) = LOWER(?)
                )
                LIMIT 1",
                [$titleGuess, str_replace('-', '_', $raw), str_replace('_', '-', $raw)]
            );
        }
        if (!$post) {
            Response::notFound('Article not found');
        }
        $path = PostAssets::articlePath((int) $post['user_id'], (string) $post['uuid']);
        if (!is_file($path)) {
            Response::notFound('Article not found');
        }
        $html = (string) file_get_contents($path);
        $cover = ArticleContent::extractCoverImage($html);
        $paragraph = ArticleContent::extractFirstParagraph($html);
        $previewImage = Articles::resolvePreviewImage(
            (string) ($post['preview_image'] ?? ''),
            $cover
        );
        if ($paragraph === '') {
            $paragraph = htmlspecialchars((string) ($post['description'] ?? ''), ENT_QUOTES, 'UTF-8');
        }
        Response::success([
            'id' => (int) $post['id'],
            'uuid' => (string) $post['uuid'],
            'title' => (string) ($post['title'] ?? ''),
            'preview_image' => $previewImage,
            'paragraph' => $paragraph,
            'url' => \APP_URL . '/article/' . $post['uuid'],
        ]);
    }

    public static function resolvePreviewImage(string $previewImage, string $cover): string
    {
        if (
            $previewImage !== ''
            && $previewImage !== PostAssets::defaultPreview()
            && !preg_match('/\.html(\?|#|$)/i', $previewImage)
            && !preg_match('~/articles/[^/?#]+\.html~i', $previewImage)
        ) {
            return $previewImage;
        }
        if ($cover !== '') {
            return $cover;
        }
        return PostAssets::defaultPreview();
    }

    private function show(): void
    {
        Request::get();
        Identity::required();
        $uuid = trim((string) Routing::segment(2));
        if (!Validate::required($uuid)) {
            Response::badRequest('Missing article uuid');
        }
        $post = Query::fetch(
            "SELECT p.id, p.user_id, p.uuid, p.title, p.description, p.status, du.account_id
            FROM ielectro_dyscover.dyscover_posts p
            INNER JOIN ielectro_dyscover.dyscover_users du ON du.id = p.user_id
            WHERE p.uuid = ?
            AND p.type = 'article'
            LIMIT 1",
            [$uuid]
        );
        if (!$post || $post['status'] !== 'active') {
            Response::notFound('Article not found');
        }
        $account = Accounts::find((int) $post['account_id']);
        $path = PostAssets::articlePath((int) $post['user_id'], (string) $post['uuid']);
        if (!is_file($path)) {
            Response::notFound('Article not found');
        }
        $content = (string) file_get_contents($path);
        $canEdit = false;
        $accountId = Identity::id();
        if ($accountId !== null) {
            $owner = Query::fetch(
                'SELECT id FROM ielectro_dyscover.dyscover_users WHERE account_id = ? LIMIT 1',
                [$accountId]
            );
            $canEdit = $owner && (int) $post['user_id'] === (int) $owner['id'];
        }
        Response::success([
            'id' => (int) $post['id'],
            'uuid' => $post['uuid'],
            'title' => $post['title'] ?? '',
            'description' => $post['description'] ?? '',
            'username' => $account['username'] ?? '',
            'content' => $content,
            'url' => \APP_URL . '/article/' . $post['uuid'],
            'can_edit' => $canEdit,
        ]);
    }

    private function update(): void
    {
        Request::put();
        $uuid = trim((string) Routing::segment(2));
        if (!Validate::required($uuid)) {
            Response::badRequest('Missing article uuid');
        }
        $post = Query::fetch(
            "SELECT id, user_id, uuid
            FROM ielectro_dyscover.dyscover_posts
            WHERE uuid = ?
            AND type = 'article'
            AND status = 'active'
            LIMIT 1",
            [$uuid]
        );
        if (!$post) {
            Response::notFound('Article not found');
        }
        if ((int) $post['user_id'] !== User::id()) {
            Response::forbidden();
        }
        $content = (string) Request::value('content');
        if (!Validate::required($content)) {
            Response::badRequest('Missing content');
        }
        $path = PostAssets::articlePath((int) $post['user_id'], (string) $post['uuid']);
        File::makeDirectory(dirname($path));
        file_put_contents($path, $content);
        Response::success('Article updated');
    }
}
