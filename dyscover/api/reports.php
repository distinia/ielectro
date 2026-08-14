<?php
namespace Dyscover;

use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
use Nesh\Schema;
use Nesh\Validate;

require_once __DIR__ . '/moderation.php';

class Reports
{
    public function index(): void
    {
        Routing::method([
            'GET'  => fn() => $this->reasons(),
            'POST' => fn() => $this->create(),
        ]);
    }

    private function reasons(): void
    {
        Request::get();
        Response::success([
            'reasons' => array_map(
                static fn(string $key, string $label): array => [
                    'id' => $key,
                    'label' => $label,
                ],
                array_keys(Moderation::REPORT_REASONS),
                array_values(Moderation::REPORT_REASONS)
            ),
        ]);
    }

    private function create(): void
    {
        Request::post();
        $reporterId = User::id();
        $input = Request::body();
        $targetType = trim((string) ($input['target_type'] ?? ''));
        if (!Validate::in($targetType, ['post', 'user'])) {
            Response::badRequest('Invalid target type');
        }
        $reason = trim((string) ($input['reason'] ?? ''));
        if (!array_key_exists($reason, Moderation::REPORT_REASONS)) {
            Response::badRequest('Invalid reason');
        }
        $details = trim((string) ($input['details'] ?? ''));
        $targetPostId = null;
        $targetUserId = null;
        if ($targetType === 'post') {
            $targetPostId = (int) ($input['post_id'] ?? 0);
            if ($targetPostId <= 0) {
                Response::badRequest('Missing post id');
            }
            $post = Query::fetch(
                'SELECT id, user_id FROM ' . Schema::DYSCOVER_POSTS . ' WHERE id = ? AND status != ? LIMIT 1',
                [$targetPostId, 'removed']
            );
            if (!$post) {
                Response::notFound('Post not found');
            }
            if ((int) $post['user_id'] === $reporterId) {
                Response::badRequest('You cannot report your own post');
            }
        } else {
            $targetUserId = (int) ($input['user_id'] ?? 0);
            if ($targetUserId <= 0) {
                Response::badRequest('Missing user id');
            }
            if ($targetUserId === $reporterId) {
                Response::badRequest('You cannot report yourself');
            }
            $exists = Query::fetch(
                'SELECT id FROM ' . Schema::DYSCOVER_USERS . ' WHERE id = ? LIMIT 1',
                [$targetUserId]
            );
            if (!$exists) {
                Response::notFound('User not found');
            }
        }
        $pending = Query::fetch(
            'SELECT id FROM ' . Schema::DYSCOVER_REPORTS . '
            WHERE reporter_user_id = ?
            AND target_type = ?
            AND status = ?
            AND (
                (target_type = ? AND target_post_id = ?)
                OR (target_type = ? AND target_user_id = ?)
            )
            LIMIT 1',
            [
                $reporterId,
                $targetType,
                'pending',
                'post',
                $targetPostId ?? 0,
                'user',
                $targetUserId ?? 0,
            ]
        );
        if ($pending) {
            Response::conflict('You already reported this content');
        }
        Query::execute(
            'INSERT INTO ' . Schema::DYSCOVER_REPORTS . '(
                reporter_user_id, target_type, target_post_id, target_user_id, reason, details
            ) VALUES (?, ?, ?, ?, ?, ?)',
            [
                $reporterId,
                $targetType,
                $targetPostId,
                $targetUserId,
                $reason,
                $details !== '' ? $details : null,
            ]
        );
        Response::created(['message' => 'Report submitted']);
    }
}
