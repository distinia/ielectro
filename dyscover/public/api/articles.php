<?php
namespace Dyscover;
use Nesh\File;
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
            'PUT' => fn() => $this->update(),
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
