<?php
namespace Dyscover;
use Nesh\Audio;
use Nesh\File;
use Nesh\Generate;
use Nesh\Image;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
use Nesh\Validate;
use Nesh\Video;
class Inbox
{
    public function index(): void
    {
        if (Routing::segment(2) === 'upload') {
            (new InboxUpload())->index();
            return;
        }
        if (Routing::segment(3) === 'messages') {
            (new InboxMessages())->index();
            return;
        }
        Routing::method([
            'GET'    => fn() => Routing::id() ? $this->show() : $this->list(),
            'POST'   => fn() => $this->create(),
            'PATCH'  => fn() => $this->update(),
            'DELETE' => fn() => $this->delete(),
        ]);
    }
    private function list(): void
    {
        Request::get();
        Response::success(InboxData::threads(User::id()));
    }
    private function show(): void
    {
        Request::get();
        $chatId = Routing::id();
        InboxAccess::requireMember((int) $chatId, User::id());
        Response::success(InboxData::chat((int) $chatId));
    }
    private function create(): void
    {
        Request::post();
        $participantId = (int) Request::value('participant_id');
        if ($participantId <= 0) {
            Response::badRequest('Missing participant_id');
        }
        $selfId = User::id();
        if ($selfId === $participantId) {
            Response::badRequest('Invalid participant');
        }
        $existing = InboxData::directChat($selfId, $participantId);
        if ($existing) {
            Response::success($existing);
        }
        Response::created(InboxData::createDirect($selfId, $participantId));
    }
    private function update(): void
    {
        Request::patch();
        Response::success('Nothing to update');
    }
    private function delete(): void
    {
        Request::delete();
        $chatId = Routing::id();
        InboxAccess::requireMember((int) $chatId, User::id());
        Query::execute('DELETE FROM ielectro_dyscover.dyscover_inbox_messages WHERE chat_id = ?', [$chatId]);
        Query::execute('DELETE FROM ielectro_dyscover.dyscover_inbox_typing WHERE chat_id = ?', [$chatId]);
        Query::execute('DELETE FROM ielectro_dyscover.dyscover_inbox_members WHERE chat_id = ?', [$chatId]);
        Query::execute('DELETE FROM ielectro_dyscover.dyscover_inbox_chats WHERE id = ?', [$chatId]);
        Response::success('Inbox deleted');
    }
}
class InboxMessages
{
    public function index(): void
    {
        Routing::method([
            'GET'    => fn() => $this->list(),
            'POST'   => fn() => $this->create(),
            'PUT'    => fn() => $this->update(),
            'DELETE' => fn() => $this->delete(),
        ]);
    }
    private function list(): void
    {
        Request::get();
        $chatId = Routing::id();
        InboxAccess::requireMember((int) $chatId, User::id());
        InboxReads::markChatRead((int) $chatId, User::id());
        Response::success(InboxData::messages((int) $chatId));
    }
    private function create(): void
    {
        Request::post();
        $chatId = Routing::id();
        InboxAccess::requireMember((int) $chatId, User::id());
        $body = trim((string) Request::value('body'));
        $type = trim((string) Request::value('type', 'text'));
        $attachment = trim((string) Request::value('attachment'));
        if ($body === '' && $attachment === '') {
            Response::badRequest('Missing message');
        }
        if (!Validate::in($type, ['text', 'image', 'video', 'audio', 'file', 'post'])) {
            $type = $attachment !== '' ? 'file' : 'text';
        }
        $messageId = InboxData::createMessage(
            (int) $chatId,
            User::id(),
            $type,
            $body !== '' ? $body : null,
            $attachment !== '' ? $attachment : null
        );
        Response::created(['id' => $messageId]);
    }
    private function update(): void
    {
        Request::put();
        $messageId = (int) Routing::segment(4);
        $body = trim((string) Request::value('body'));
        if (!Validate::required($body)) {
            Response::badRequest('Missing body');
        }
        Query::execute(
            'UPDATE ielectro_dyscover.dyscover_inbox_messages
            SET body = ?
            WHERE id = ? AND sender_id = ?',
            [$body, $messageId, User::id()]
        );
        Response::success('Message updated');
    }
    private function delete(): void
    {
        Request::delete();
        $messageId = (int) Routing::segment(4);
        Query::execute(
            'DELETE FROM ielectro_dyscover.dyscover_inbox_messages
            WHERE id = ? AND sender_id = ?',
            [$messageId, User::id()]
        );
        Response::success('Message deleted');
    }
}
class InboxData
{
    public static function threads(int $userId): array
    {
        $rows = Query::fetchAll(
            "SELECT
                c.id,
                c.updated_at,
                peer.id AS peer_id,
                lm.body AS last_body,
                lm.type AS last_type,
                (
                    SELECT COUNT(*)
                    FROM ielectro_dyscover.dyscover_inbox_messages um
                    LEFT JOIN ielectro_dyscover.dyscover_inbox_message_reads r
                        ON r.message_id = um.id AND r.user_id = ?
                    WHERE um.chat_id = c.id
                    AND um.sender_id != ?
                    AND r.message_id IS NULL
                ) AS unread_count
            FROM ielectro_dyscover.dyscover_inbox_chats c
            INNER JOIN ielectro_dyscover.dyscover_inbox_members mem ON mem.chat_id = c.id
            INNER JOIN ielectro_dyscover.dyscover_inbox_members peer_mem
                ON peer_mem.chat_id = c.id AND peer_mem.user_id != mem.user_id
            INNER JOIN ielectro_dyscover.dyscover_users peer ON peer.id = peer_mem.user_id
            LEFT JOIN ielectro_dyscover.dyscover_inbox_messages lm ON lm.id = (
                SELECT m2.id FROM ielectro_dyscover.dyscover_inbox_messages m2
                WHERE m2.chat_id = c.id
                ORDER BY m2.created_at DESC, m2.id DESC LIMIT 1
            )
            WHERE mem.user_id = ?
            ORDER BY c.updated_at DESC",
            [$userId, $userId, $userId]
        );
        return array_map(fn(array $row): array => [
            'id' => (int) $row['id'],
            'peer' => UserCard::one((int) $row['peer_id']),
            'unread' => (int) ($row['unread_count'] ?? 0),
            'last_message' => self::preview($row['last_body'] ?? '', $row['last_type'] ?? 'text'),
            'updated_at' => $row['updated_at'],
        ], $rows);
    }
    public static function chat(int $chatId): array
    {
        $row = Query::fetch(
            'SELECT id, type, created_at, updated_at
            FROM ielectro_dyscover.dyscover_inbox_chats WHERE id = ? LIMIT 1',
            [$chatId]
        );
        if (!$row) {
            Response::notFound('Inbox not found');
        }
        return [
            'id' => (int) $row['id'],
            'type' => $row['type'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
            'messages' => self::messages($chatId),
        ];
    }
    public static function messages(int $chatId): array
    {
        $rows = Query::fetchAll(
            "SELECT m.id, m.sender_id, m.type, m.body, m.attachment, m.created_at, du.account_id
            FROM ielectro_dyscover.dyscover_inbox_messages m
            INNER JOIN ielectro_dyscover.dyscover_users du ON du.id = m.sender_id
            WHERE m.chat_id = ?
            ORDER BY m.created_at ASC, m.id ASC",
            [$chatId]
        );
        $rows = Accounts::attachUsernames($rows);
        return array_map(fn(array $row): array => [
            'id' => (int) $row['id'],
            'sender_id' => (int) $row['sender_id'],
            'username' => $row['username'],
            'avatar' => Avatar::url((int) $row['sender_id']),
            'type' => $row['type'],
            'body' => $row['body'] ?? '',
            'attachment' => $row['attachment'] ?? '',
            'created_at' => $row['created_at'],
        ], $rows);
    }
    public static function directChat(int $userA, int $userB): ?array
    {
        $row = Query::fetch(
            "SELECT c.id
            FROM ielectro_dyscover.dyscover_inbox_chats c
            INNER JOIN ielectro_dyscover.dyscover_inbox_members m1 ON m1.chat_id = c.id AND m1.user_id = ?
            INNER JOIN ielectro_dyscover.dyscover_inbox_members m2 ON m2.chat_id = c.id AND m2.user_id = ?
            WHERE c.type = 'direct' LIMIT 1",
            [$userA, $userB]
        );
        return $row ? ['id' => (int) $row['id']] : null;
    }
    public static function createDirect(int $userA, int $userB): array
    {
        Query::execute(
            "INSERT INTO ielectro_dyscover.dyscover_inbox_chats(type, updated_at) VALUES('direct', NOW())"
        );
        $chatId = Query::lastId();
        Query::execute(
            'INSERT INTO ielectro_dyscover.dyscover_inbox_members(chat_id, user_id) VALUES(?, ?), (?, ?)',
            [$chatId, $userA, $chatId, $userB]
        );
        return ['id' => $chatId];
    }
    public static function createMessage(
        int $chatId,
        int $senderId,
        string $type,
        ?string $body,
        ?string $attachment
    ): int {
        Query::execute(
            'INSERT INTO ielectro_dyscover.dyscover_inbox_messages(
                chat_id, sender_id, type, body, attachment
            ) VALUES (?, ?, ?, ?, ?)',
            [$chatId, $senderId, $type, $body, $attachment]
        );
        $messageId = Query::lastId();
        Query::execute(
            'UPDATE ielectro_dyscover.dyscover_inbox_chats SET updated_at = NOW() WHERE id = ?',
            [$chatId]
        );
        return $messageId;
    }
    private static function preview(string $body, string $type): string
    {
        if ($type === 'text') {
            return $body;
        }
        return match ($type) {
            'image' => 'Photo',
            'video' => 'Video',
            'audio' => 'Audio',
            default => 'Attachment',
        };
    }
}
class InboxAccess
{
    public static function requireMember(int $chatId, int $userId): void
    {
        if (!Query::exists(
            'SELECT 1 FROM ielectro_dyscover.dyscover_inbox_members
            WHERE chat_id = ? AND user_id = ? LIMIT 1',
            [$chatId, $userId]
        )) {
            Response::forbidden();
        }
    }
}
class InboxReads
{
    public static function markChatRead(int $chatId, int $userId): void
    {
        $rows = Query::fetchAll(
            'SELECT id FROM ielectro_dyscover.dyscover_inbox_messages
            WHERE chat_id = ? AND sender_id != ?',
            [$chatId, $userId]
        );
        foreach ($rows as $row) {
            Query::execute(
                'INSERT IGNORE INTO ielectro_dyscover.dyscover_inbox_message_reads(message_id, user_id)
                VALUES(?, ?)',
                [(int) $row['id'], $userId]
            );
        }
    }
}
class InboxUpload
{
    public function index(): void
    {
        Routing::method([
            'POST' => fn() => $this->store(),
        ]);
    }
    private function store(): void
    {
        Request::post();
        $userId = User::id();
        $file = Request::file('file')
            ?? Request::file('attachment')
            ?? Request::file('media');
        if (!$file) {
            Response::badRequest('Missing file');
        }
        $mime = mime_content_type($file['tmp_name']) ?: (string) ($file['type'] ?? '');
        $kind = match (true) {
            str_starts_with($mime, 'image/') => 'image',
            str_starts_with($mime, 'video/') => 'video',
            str_starts_with($mime, 'audio/') => 'audio',
            default => 'file',
        };
        $dir = \APP_ASSETS . '/users/' . $userId . '/inbox';
        File::makeDirectory($dir);
        $name = substr(Generate::token(8), 0, 16);
        if ($kind === 'image') {
            $asset = Image::upload($file, $name, true);
            $asset->fit(1920, 1920)->save($dir);
        } elseif ($kind === 'video') {
            $asset = Video::upload($file, $name, true);
            $asset->save($dir);
        } elseif ($kind === 'audio') {
            $asset = Audio::upload($file, $name, true);
            $asset->save($dir);
        } else {
            $asset = File::upload($file, $name, true);
            $asset->save($dir);
        }
        $filename = $asset->filename();
        if ($filename === null || $filename === '') {
            Response::error('Unable to save attachment');
        }
        Response::success([
            'url' => \APP_URL . '/assets/users/' . $userId . '/inbox/' . $filename,
            'type' => $kind,
            'msg_kind' => $kind,
        ]);
    }
}
