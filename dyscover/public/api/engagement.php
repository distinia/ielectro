<?php
namespace Dyscover;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
class Engagement {
    public static function search() {
        Request::allow(['GET']);
        $term = trim((string) Request::value('term'));
        $type = trim((string) Request::value('type'));
        if ($term === '') {
            Response::badRequest('Missing term');
        }
        if (!in_array($type, Post::$types, true)) {
            Response::badRequest('Invalid type');
        }
        $rows = Query::fetchAll(
            'SELECT p.*, a.username, an.likes, an.comments, an.shares, an.views
            FROM dyscover_posts p
            LEFT JOIN accounts a ON a.id = p.user_id
            LEFT JOIN dyscover_post_analytics an ON an.post_id = p.id 
            WHERE p.type = ?
            AND p.status = ?
            AND (
                p.title LIKE ?
                OR p.description LIKE ?
                OR p.file LIKE ?
            )
            ORDER BY p.created_at DESC
            LIMIT 50',
            [
                $type,
                'active',
                '%'.$term.'%',
                '%'.$term.'%',
                '%'.$term.'%'
            ]
        );
        $out = [];
        foreach ($rows as $row) {
            $out[] = Post::map($row);
        }
        Response::success('OK', $out);
    }
}
