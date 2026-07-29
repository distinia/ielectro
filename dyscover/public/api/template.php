<?php
namespace Dyscover;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
class Template
{
    private static function fields($id)
    {
        return Query::fetchAll(
            'SELECT name,type,position
             FROM dyscover_template_fields
             WHERE template_id = ?
             ORDER BY position ASC',
            [$id]
        );
    }
    private static function insertFields($id, $fields)
    {
        foreach ($fields as $position => $field) {
            Query::execute(
                'INSERT INTO dyscover_template_fields
                (template_id,name,type,position)
                VALUES (?,?,?,?)',
                [
                    $id,
                    $field['name'] ?? '',
                    $field['type'] ?? 'text',
                    $position
                ]
            );
        }
    }
    public static function create(mixed $arg1, mixed $arg2) {
        if (is_array($fields)) {
            self::insertFields($id, $fields);
        }
    }
    public static function update(mixed $arg1, mixed $arg2) {
        Query::execute(
            'DELETE FROM dyscover_template_fields
             WHERE template_id = ?',
            [$id]
        );
        if (is_array($fields)) {
            self::insertFields($id, $fields);
        }
    }
    public static function delete(mixed $arg1, mixed $arg2) {
        self::removeTemplateInArticles($file);
        Query::execute(
            'DELETE FROM dyscover_template_fields
             WHERE template_id = ?',
            [$id]
        );
    }
    public static function getFields(mixed $arg1) {
        return self::fields($id);
    }
    public static function data() {
        Request::allow(['GET']);
        $file = trim((string) Request::value('file'));
        if ($file === '') {
            Response::badRequest('Missing file');
        }
        $row = Query::fetch(
            'SELECT id
             FROM dyscover_posts
             WHERE file = ?
             AND type = ?
             AND status = ?
             LIMIT 1',
            [
                $file,
                'template',
                'active'
            ]
        );
        if (!$row) {
            Response::notFound('Template not found');
        }
        Response::success('OK', [
            'fields' => self::fields((int) $row['id'])
        ]);
    }
    public static function list() {
        Request::allow(['GET']);
        Auth::requireLogin();
        $rows = Query::fetchAll(
            'SELECT p.*, a.username
             FROM dyscover_posts p
             LEFT JOIN accounts a ON a.id = p.user_id
             WHERE p.type = ?
             AND p.status = ?
             ORDER BY p.created_at DESC',
            [
                'template',
                'active'
            ]
        );
        $out = [];
        foreach ($rows as $row) {
            $out[] = Post::map($row);
        }
        Response::success('OK', $out);
    }
    private static function removeTemplateInArticles($file)
    {
        foreach (glob('../../u/*/article/*.html') as $article) {
            $content = file_get_contents($article);
            $updated = preg_replace(
                '/<table[^>]*data-file="'.preg_quote($file, '/').'".*?</table>/is',
                '',
                $content
            );
            if ($updated !== $content) {
                file_put_contents($article, $updated);
            }
        }
    }
}
