<?php
namespace Dyscover;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
class CreatorCenter
{
    public function index(): void
    {
        Request::get();
        $userId = User::id();
        Response::success([
            'articles' => self::count($userId, 'article'),
            'images' => self::count($userId, 'image'),
            'videos' => self::count($userId, 'video'),
            'audios' => self::count($userId, 'audio'),
            'documents' => self::count($userId, 'document'),
            'templates' => self::count($userId, 'template'),
        ]);
    }
    private static function count(int $userId, string $type): int
    {
        return Query::count(
            "SELECT COUNT(*)
            FROM posts
            WHERE user_id = ?
            AND type = ?
            AND status = 'active'",
            [$userId, $type]
        );
    }
}
