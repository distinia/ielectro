<?php
namespace Dyscover;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
use Nesh\Validate;
class Templates
{
    public function index(): void
    {
        if (Routing::segment(3) !== 'fields') {
            Response::notFound();
        }
        Routing::method([
            'GET'   => fn() => $this->listFields(),
            'PATCH' => fn() => $this->updateFields(),
        ]);
    }
    private function listFields(): void
    {
        Request::get();
        $templateId = Routing::id();
        if ($templateId === null) {
            Response::badRequest('Missing template id');
        }
        self::requireTemplate($templateId);
        Response::success(TemplateFields::list($templateId));
    }
    private function updateFields(): void
    {
        Request::patch();
        $templateId = Routing::id();
        if ($templateId === null) {
            Response::badRequest('Missing template id');
        }
        self::requireOwned($templateId);
        TemplateFields::sync($templateId, Request::value('fields'));
        Response::success(TemplateFields::list($templateId));
    }
    private static function requireTemplate(int $id): void
    {
        $row = Query::fetch(
            "SELECT id FROM posts
            WHERE id = ? AND type = 'template' AND status = 'active' LIMIT 1",
            [$id]
        );
        if (!$row) {
            Response::notFound('Template not found');
        }
    }
    private static function requireOwned(int $id): void
    {
        $row = Query::fetch(
            "SELECT user_id FROM posts
            WHERE id = ? AND type = 'template' AND status = 'active' LIMIT 1",
            [$id]
        );
        if (!$row) {
            Response::notFound('Template not found');
        }
        if ((int) $row['user_id'] !== User::id()) {
            Response::forbidden();
        }
    }
}
class TemplateFields
{
    public static function list(int $templateId): array
    {
        return Query::fetchAll(
            'SELECT id, name, type, position
            FROM template_fields
            WHERE template_id = ?
            ORDER BY position ASC',
            [$templateId]
        );
    }
    public static function sync(int $templateId, mixed $fields): void
    {
        if (!is_array($fields)) {
            Response::badRequest('Invalid fields');
        }
        $existing = Query::fetchAll(
            'SELECT id FROM template_fields WHERE template_id = ?',
            [$templateId]
        );
        $existingIds = array_map(
            fn(array $row): int => (int) $row['id'],
            $existing
        );
        $keptIds = [];
        foreach ($fields as $position => $field) {
            if (!is_array($field)) {
                continue;
            }
            $name = trim((string) ($field['name'] ?? ''));
            if (!Validate::required($name)) {
                continue;
            }
            $type = trim((string) ($field['type'] ?? 'text'));
            $fieldId = isset($field['id']) ? (int) $field['id'] : 0;
            if ($fieldId > 0 && in_array($fieldId, $existingIds, true)) {
                Query::execute(
                    'UPDATE template_fields
                    SET name = ?, type = ?, position = ?
                    WHERE id = ? AND template_id = ?',
                    [$name, $type, (int) $position, $fieldId, $templateId]
                );
                $keptIds[] = $fieldId;
                continue;
            }
            Query::execute(
                'INSERT INTO template_fields(template_id, name, type, position)
                VALUES (?, ?, ?, ?)',
                [$templateId, $name, $type, (int) $position]
            );
            $keptIds[] = Query::lastId();
        }
        foreach (array_diff($existingIds, $keptIds) as $removeId) {
            Query::execute(
                'DELETE FROM template_fields
                WHERE id = ? AND template_id = ?',
                [$removeId, $templateId]
            );
        }
    }
}
