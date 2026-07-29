<?php
namespace Dyscover;
use Nesh\Audio;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Schema;
use Nesh\Session;
use Nesh\Video;
class Chat
{
    private static function normalizeParticipantIds($first, $second)
    {
        $first = (int) $first;
        $second = (int) $second;
        if ($first === 0 || $second === 0 || $first === $second) {
            return null;
        }
        if ($first < $second) {
            return [$first, $second];
        }
        return [$second, $first];
    }
    private static function findThread($userOneId, $userTwoId)
    {
        return Query::fetch(
            'SELECT * FROM dyscover_inbox_conversations WHERE user_one_id = ? AND user_two_id = ? LIMIT 1',
            [$userOneId, $userTwoId]
        );
    }
    private static function getThread($threadId)
    {
        return Query::fetch(
            'SELECT * FROM dyscover_inbox_conversations WHERE id = ? AND (user_one_id = ? OR user_two_id = ?) LIMIT 1',
            [$threadId, Session::id(), Session::id()]
        );
    }
    private static function peerIdFromThread(array $thread, int $id): int
    {
        return (int) $thread['user_one_id'] === $id
            ? (int) $thread['user_two_id']
            : (int) $thread['user_one_id'];
    }
    private static function peerUsernameFromThread(array $thread): string
    {
        $peerId = self::peerIdFromThread($thread, (int) Session::id());
        $row = Query::fetch(
            'SELECT username FROM accounts WHERE id = ? LIMIT 1',
            [$peerId]
        );
        return (string) ($row['username'] ?? '');
    }
    private static function mapMessage(array $row): array
    {
        $username = (string) ($row['username'] ?? '');
        $type = (string) ($row['type'] ?? 'text');
        return [
            'id' => (int) ($row['id'] ?? 0),
            'sender' => $username,
            'body' => (string) ($row['body'] ?? ''),
            'msg_kind' => $type,
            'attachment_url' => (string) ($row['attachment'] ?? ''),
            'sender_avatar' => Avatar::url($username),
            'created_at' => (string) ($row['created_at'] ?? ''),
        ];
    }
    private static function previewFromMessage(?array $msg): string
    {
        if (!$msg) {
            return '';
        }
        $body = trim((string) ($msg['body'] ?? ''));
        $type = (string) ($msg['type'] ?? 'text');
        if (strpos($body, '@@DYSCOVER_POST@@') === 0) {
            $payload = json_decode(substr($body, strlen('@@DYSCOVER_POST@@')), true);
            if (is_array($payload)) {
                $postType = (string) ($payload['type'] ?? 'post');
                $author = (string) ($payload['username'] ?? '');
                if ($author !== '') {
                    return 'Shared a '.$postType.' by @'.$author;
                }
                return 'Shared a '.$postType;
            }
            return 'Shared a post';
        }
        if ($type === 'text') {
            return $body;
        }
        if ($body !== '') {
            return $body;
        }
        $labels = [
            'image' => 'Photo',
            'video' => 'Video',
            'audio' => 'Audio',
            'file' => 'Attachment',
        ];
        return $labels[$type] ?? 'Message';
    }
    private static function detectMsgKindFromFile(array $file): string
    {
        $mime = strtolower((string) ($file['type'] ?? ''));
        if (strpos($mime, 'image/') === 0) {
            return 'image';
        }
        if (strpos($mime, 'video/') === 0) {
            return 'video';
        }
        if (strpos($mime, 'audio/') === 0) {
            return 'audio';
        }
        $ext = strtolower(pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION));
        if (in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'], true)) {
            return 'image';
        }
        if (in_array($ext, ['mp4', 'webm', 'mov', 'mkv'], true)) {
            return 'video';
        }
        if (in_array($ext, ['mp3', 'wav', 'ogg', 'm4a'], true)) {
            return 'audio';
        }
        return 'file';
    }
    private static function touchThreadAfterMessage(int $threadId, int $messageId): void
    {
        Query::execute(
            'UPDATE dyscover_inbox_conversations SET updated_at = NOW() WHERE id = ?',
            [$threadId]
        );
        if ($messageId > 0 && Schema::columnExists('dyscover_inbox_conversations', 'last_message_id')) {
            Query::execute(
                'UPDATE dyscover_inbox_conversations SET last_message_id = ? WHERE id = ?',
                [$messageId, $threadId]
            );
        }
    }
    private static function unreadCountSql(): string
    {
        if (!Schema::columnExists('dyscover_inbox_messages', 'read_at')) {
            return '0';
        }
        return '(
            SELECT COUNT(*)
            FROM dyscover_inbox_messages um
            WHERE um.thread_id = t.id
            AND um.sender_id != ?
            AND um.read_at IS NULL
        )';
    }
    private static function storeUploadedFile(array $file): string
    {
        $extension = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
        if ($extension === '') {
            Response::badRequest('Missing attachment extension');
        }
        $fileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($file['name']));
        $path = '../../content/chat/';
        if (!is_dir($path) && !mkdir($path, 0755, true)) {
            Response::error('Unable to create attachment directory');
        }
        $target = $path.$fileName;
        $counter = 1;
        while (file_exists($target)) {
            $target = $path.pathinfo($fileName, PATHINFO_FILENAME).'_'.$counter.'.'.$extension;
            $counter++;
        }
        if (!move_uploaded_file($file['tmp_name'], $target)) {
            Response::error('Upload failed');
        }
        return APP_URL.'/content/chat/'.rawurlencode(basename($target));
    }
    public static function createThread() {
        Request::allow(['POST']);
        Auth::requireLogin();
        $participant = trim((string) Request::value('participant'));
        if ($participant === '') {
            Response::badRequest('Missing participant');
        }
        if ($participant === Auth::username()) {
            Response::badRequest('Cannot create thread with yourself');
        }
        $other = Query::fetch('SELECT id FROM accounts WHERE username = ? LIMIT 1', [$participant]);
        if (!$other) {
            Response::notFound('Participant not found');
        }
        [$userOneId, $userTwoId] = self::normalizeParticipantIds(Session::id(), (int) $other['id']);
        if ($userOneId === null) {
            Response::badRequest('Invalid participant');
        }
        $thread = self::findThread($userOneId, $userTwoId);
        if ($thread) {
            Response::success('OK', $thread);
        }
        Query::execute(
            'INSERT INTO dyscover_inbox_conversations(user_one_id,user_two_id,updated_at) VALUES(?,?,NOW())',
            [$userOneId, $userTwoId]
        );
        $threadId = Query::lastId();
        $thread = Query::fetch('SELECT * FROM dyscover_inbox_conversations WHERE id = ? LIMIT 1', [$threadId]);
        Response::created('Thread created', $thread);
    }
    public static function listThreads() {
        Request::allow(['GET']);
        Auth::requireLogin();
        $id = (int) Session::id();
        $unreadSql = self::unreadCountSql();
        $unreadBinds = Schema::columnExists('dyscover_inbox_messages', 'read_at') ? [$id] : [];
        $rows = Query::fetchAll(
            "SELECT t.*,
                    a.username AS participant_username,
                    lm.body AS last_body,
                    lm.type AS last_type,
                    {$unreadSql} AS unread_count
             FROM dyscover_inbox_conversations t
             INNER JOIN accounts a
                ON a.id = IF(t.user_one_id = ?, t.user_two_id, t.user_one_id)
             LEFT JOIN dyscover_inbox_messages lm ON lm.id = (
                SELECT m2.id
                FROM dyscover_inbox_messages m2
                WHERE m2.thread_id = t.id
                ORDER BY m2.created_at DESC, m2.id DESC
                LIMIT 1
             )
             WHERE t.user_one_id = ? OR t.user_two_id = ?
             ORDER BY t.updated_at DESC",
            array_merge($unreadBinds, [$id, $id, $id])
        );
        $threads = [];
        foreach ($rows as $row) {
            $peer = (string) ($row['participant_username'] ?? '');
            $threads[] = [
                'id' => (int) ($row['id'] ?? 0),
                'peer' => $peer,
                'peer_avatar' => Avatar::url($peer),
                'has_unread' => ((int) ($row['unread_count'] ?? 0)) > 0,
                'last_message' => self::previewFromMessage([
                    'body' => $row['last_body'] ?? '',
                    'type' => $row['last_type'] ?? 'text',
                ]),
            ];
        }
        Response::success('OK', $threads);
    }
    public static function messages() {
        Request::allow(['GET']);
        Auth::requireLogin();
        $threadId = (int) Request::value('thread_id');
        if ($threadId <= 0) {
            Response::badRequest('Missing thread id');
        }
        $thread = self::getThread($threadId);
        if (!$thread) {
            Response::forbidden();
        }
        if (Schema::columnExists('dyscover_inbox_messages', 'read_at')) {
            Query::execute(
                'UPDATE dyscover_inbox_messages
                 SET read_at = NOW()
                 WHERE thread_id = ?
                 AND sender_id != ?
                 AND read_at IS NULL',
                [$threadId, Session::id()]
            );
        }
        $rows = Query::fetchAll(
            'SELECT m.*, a.username
             FROM dyscover_inbox_messages m
             INNER JOIN accounts a ON a.id = m.sender_id
             WHERE m.thread_id = ?
             ORDER BY m.created_at ASC',
            [$threadId]
        );
        $peer = self::peerUsernameFromThread($thread);
        $messages = array_map([self::class, 'mapMessage'], $rows);
        Response::success('OK', [
            'messages' => $messages,
            'peer_avatar' => Avatar::url($peer),
        ]);
    }
    public static function send() {
        Request::allow(['POST']);
        Auth::requireLogin();
        $threadId = (int) Request::value('thread_id');
        $body = trim((string) (Request::value('message') ?? Request::value('body') ?? ''));
        $attachmentUrl = trim((string) Request::value('attachment_url'));
        $msgKind = trim((string) (Request::value('msg_kind') ?? 'text'));
        if ($threadId <= 0) {
            Response::badRequest('Missing thread id');
        }
        if ($body === '' && $attachmentUrl === '') {
            Response::badRequest('Missing message');
        }
        $thread = self::getThread($threadId);
        if (!$thread) {
            Response::forbidden();
        }
        $allowed = ['text', 'image', 'video', 'audio', 'file'];
        if (!in_array($msgKind, $allowed, true)) {
            $msgKind = $attachmentUrl !== '' ? 'file' : 'text';
        }
        if ($attachmentUrl === '') {
            $msgKind = 'text';
        }
        Query::execute(
            'INSERT INTO dyscover_inbox_messages(thread_id,sender_id,type,body,attachment,created_at) VALUES(?,?,?,?,?,NOW())',
            [
                $threadId,
                Session::id(),
                $msgKind,
                $body !== '' ? $body : null,
                $attachmentUrl !== '' ? $attachmentUrl : null,
            ]
        );
        $messageId = (int) Query::lastId();
        self::touchThreadAfterMessage($threadId, $messageId);
        Response::success('Message sent', ['id' => $messageId]);
    }
    public static function uploadAttachment() {
        Request::allow(['POST']);
        Auth::requireLogin();
        $file = Request::file('file') ?? Request::file('attachment');
        if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::badRequest('Missing file');
        }
        $msgKind = self::detectMsgKindFromFile($file);
        $url = self::storeUploadedFile($file);
        Response::success('OK', [
            'url' => $url,
            'msg_kind' => $msgKind,
        ]);
    }
    public static function deleteThread() {
        Request::allow(['POST']);
        Auth::requireLogin();
        $threadId = (int) Request::value('thread_id');
        if ($threadId <= 0) {
            Response::badRequest('Missing thread id');
        }
        $thread = self::getThread($threadId);
        if (!$thread) {
            Response::forbidden();
        }
        if (Schema::tableExists('dyscover_inbox_reads')) {
            Query::execute('DELETE FROM dyscover_inbox_reads WHERE thread_id = ?', [$threadId]);
        }
        Query::execute('DELETE FROM dyscover_inbox_messages WHERE thread_id = ?', [$threadId]);
        Query::execute('DELETE FROM dyscover_inbox_typing WHERE thread_id = ?', [$threadId]);
        Query::execute('DELETE FROM dyscover_inbox_conversations WHERE id = ?', [$threadId]);
        Response::success('Deleted');
    }
    public static function typing() {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if ($method === 'GET') {
            self::typingStatus();
            return;
        }
        self::typingPulse();
    }
    private static function typingPulse()
    {
        Request::allow(['POST']);
        Auth::requireLogin();
        $threadId = (int) Request::value('thread_id');
        if ($threadId <= 0) {
            Response::badRequest('Missing thread id');
        }
        $thread = self::getThread($threadId);
        if (!$thread) {
            Response::forbidden();
        }
        $active = Request::value('active');
        $isActive = $active === null || $active === '' || (string) $active === '1';
        if ($isActive) {
            Query::execute(
                'INSERT INTO dyscover_inbox_typing(thread_id,user_id,updated_at) VALUES(?,?,NOW())
                 ON DUPLICATE KEY UPDATE updated_at = NOW()',
                [$threadId, Session::id()]
            );
        } else {
            Query::execute(
                'DELETE FROM dyscover_inbox_typing WHERE thread_id = ? AND user_id = ?',
                [$threadId, Session::id()]
            );
        }
        Response::success('OK', ['typing' => $isActive ? 1 : 0]);
    }
    private static function typingStatus()
    {
        Request::allow(['GET']);
        Auth::requireLogin();
        $threadId = (int) Request::value('thread_id');
        if ($threadId <= 0) {
            Response::badRequest('Missing thread id');
        }
        $thread = self::getThread($threadId);
        if (!$thread) {
            Response::forbidden();
        }
        $peerId = self::peerIdFromThread($thread, (int) Session::id());
        $row = Query::fetch(
            'SELECT t.updated_at, a.username
             FROM dyscover_inbox_typing t
             INNER JOIN accounts a ON a.id = t.user_id
             WHERE t.thread_id = ?
             AND t.user_id = ?
             AND t.updated_at >= (NOW() - INTERVAL 6 SECOND)
             LIMIT 1',
            [$threadId, $peerId]
        );
        Response::success('OK', [
            'typing' => (bool) $row,
            'peer' => (string) ($row['username'] ?? self::peerUsernameFromThread($thread)),
        ]);
    }
    public static function suggestions() {
        Request::allow(['GET']);
        Auth::requireLogin();
        $term = trim((string) Request::value('term'));
        if ($term !== '') {
            $like = '%'.$term.'%';
            $rows = Query::fetchAll(
                'SELECT username FROM accounts WHERE username LIKE ? AND id != ? ORDER BY username ASC LIMIT 15',
                [$like, Session::id()]
            );
            $users = [];
            foreach ($rows as $row) {
                $username = (string) ($row['username'] ?? '');
                if ($username === '') {
                    continue;
                }
                $users[] = [
                    'username' => $username,
                    'avatar' => Avatar::url($username),
                ];
            }
            Response::success('OK', ['users' => $users]);
        }
        $rows = Query::fetchAll(
            'SELECT a.username
             FROM dyscover_follows f
             INNER JOIN accounts a ON a.id = f.followed_id
             WHERE f.follower_id = ?
             ORDER BY a.username ASC',
            [Session::id()]
        );
        $followings = [];
        foreach ($rows as $row) {
            $username = (string) ($row['username'] ?? '');
            if ($username === '') {
                continue;
            }
            $followings[] = [
                'username' => $username,
                'avatar' => Avatar::url($username),
            ];
        }
        Response::success('OK', ['followings' => $followings]);
    }
    public static function incoming() {
        Request::allow(['GET']);
        Auth::requireLogin();
        $id = (int) Session::id();
        if (Request::value('bootstrap')) {
            $row = Query::fetch(
                'SELECT COALESCE(MAX(m.id), 0) AS max_id
                 FROM dyscover_inbox_messages m
                 INNER JOIN dyscover_inbox_conversations t ON t.id = m.thread_id
                 WHERE t.user_one_id = ? OR t.user_two_id = ?',
                [$id, $id]
            );
            Response::success('OK', ['max_id' => (int) ($row['max_id'] ?? 0)]);
            return;
        }
        $afterId = (int) Request::value('after_id');
        $readFilter = Schema::columnExists('dyscover_inbox_messages', 'read_at')
            ? ' AND m.read_at IS NULL'
            : '';
        $rows = Query::fetchAll(
            "SELECT m.id, m.body, m.type, m.thread_id, a.username AS sender
             FROM dyscover_inbox_messages m
             INNER JOIN dyscover_inbox_conversations t ON t.id = m.thread_id
             INNER JOIN accounts a ON a.id = m.sender_id
             WHERE (t.user_one_id = ? OR t.user_two_id = ?)
             AND m.sender_id != ?
             AND m.id > ?{$readFilter}
             ORDER BY m.id ASC
             LIMIT 10",
            [$id, $id, $id, $afterId]
        );
        $out = [];
        foreach ($rows as $row) {
            $sender = (string) ($row['sender'] ?? '');
            $out[] = [
                'id' => (int) ($row['id'] ?? 0),
                'sender' => $sender,
                'sender_avatar' => Avatar::url($sender),
                'body' => (string) ($row['body'] ?? ''),
                'msg_kind' => (string) ($row['type'] ?? 'text'),
                'thread_id' => (int) ($row['thread_id'] ?? 0),
            ];
        }
        Response::success('OK', $out);
    }
}
