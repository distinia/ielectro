<?php
namespace Dyscover;
use Nesh\File;
use Nesh\Identity;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
use Nesh\Validate;
class Articles
{
    public function index(): void
    {
        Routing::method([
            'GET' => fn() => $this->show(),
            'PUT' => fn() => $this->update(),
        ]);
    }
    private function show(): void
    {
        Request::get();
        $uuid = trim((string) Routing::segment(2));
        if (!Validate::required($uuid)) {
            Response::badRequest('Missing article uuid');
        }
        $post = Query::fetch(
            "SELECT p.id, p.user_id, p.uuid, p.title, p.description, p.status, a.username
            FROM posts p
            INNER JOIN users du ON du.id = p.user_id
            " . Db::joinAccounts() . "
            WHERE p.uuid = ?
            AND p.type = 'article'
            LIMIT 1",
            [$uuid]
        );
        if (!$post || $post['status'] !== 'active') {
            Response::notFound('Article not found');
        }
        $path = PostAssets::articlePath((int) $post['user_id'], (string) $post['uuid']);
        if (!is_file($path)) {
            Response::notFound('Article not found');
        }
        $content = (string) file_get_contents($path);
        $canEdit = false;
        $accountId = Identity::id();
        if ($accountId !== null) {
            Db::useDyscover();
            $owner = Query::fetch(
                'SELECT id FROM users WHERE account_id = ? LIMIT 1',
                [$accountId]
            );
            $canEdit = $owner && (int) $post['user_id'] === (int) $owner['id'];
        }
        Response::success([
            'id' => (int) $post['id'],
            'uuid' => $post['uuid'],
            'title' => $post['title'] ?? '',
            'description' => $post['description'] ?? '',
            'username' => $post['username'] ?? '',
            'content' => $content,
            'url' => APP_URL . '/article/' . $post['uuid'],
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
            FROM posts
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
        $path = APP_ASSETS
            . '/users/' . $post['user_id']
            . '/articles/' . $post['uuid'] . '.html';
        File::makeDirectory(dirname($path));
        file_put_contents($path, $content);
        Response::success('Article updated');
    }
}
