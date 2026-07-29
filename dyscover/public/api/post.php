<?php
namespace Dyscover;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Session;
use Nesh\Validate;
class TableRelations
{
    private static $analytics = [
        'like' => 'likes',
        'comment' => 'comments',
        'share' => 'shares',
        'save' => 'saves',
        'view' => 'views',
        'mention' => 'mentions'
    ];
    private static $tables = [
        'like' => 'dyscover_post_likes',
        'comment' => 'dyscover_post_comments',
        'share' => 'dyscover_post_shares',
        'save' => 'dyscover_post_saves'
    ];
    public static function table(mixed $arg1) {
        return self::$tables[$type] ?? null;
    }
    public static function post() {
        $file = trim((string) Request::value('file'));
        if ($file === '') {
            Response::badRequest('Missing file');
        }
        $row = Query::fetch(
            'SELECT *
            FROM dyscover_posts
            WHERE file = ?
            AND status = ?
            LIMIT 1',
            [$file, 'active']
        );
        if (!$row) {
            Response::notFound('Post not found');
        }
        return $row;
    }
    public static function check(mixed $arg1, mixed $arg2, mixed $arg3) {
        return Query::exists(
            "SELECT 1 FROM $table WHERE post_id = ? AND user_id = ?",
            [$postId, $userId]
        );
    }
    public static function create(mixed $arg1, mixed $arg2, mixed $arg3, mixed $arg4, mixed $arg5) {
        if (!empty($data)) {
            Query::execute(
                "INSERT INTO $table(post_id, user_id, body) VALUES(?,?,?)",
                [$postId, $userId, $data['body'] ?? '']
            );
        } else {
            Query::execute(
                "INSERT INTO $table(post_id, user_id) VALUES(?,?)",
                [$postId, $userId]
            );
        }
        self::analytics($type, $postId, 1);
    }
    public static function delete(mixed $arg1, mixed $arg2, mixed $arg3, mixed $arg4) {
        Query::execute(
            "DELETE FROM $table WHERE post_id = ? AND user_id = ?",
            [$postId, $userId]
        );
        self::analytics($type, $postId, -1);
    }
    public static function analytics(mixed $arg1, mixed $arg2, mixed $arg3) {
        $field = self::$analytics[$type] ?? null;
        if (!$field) {
            return;
        }
        Query::execute(
            "UPDATE dyscover_post_analytics SET $field = GREATEST(0, $field + ?) WHERE post_id = ?",
            [$value, $postId]
        );
    }
    public static function count(mixed $arg1, mixed $arg2) {
        $field = self::$analytics[$type] ?? null;
        if (!$field) {
            return 0;
        }
        $row = Query::fetch(
            "SELECT $field FROM dyscover_post_analytics WHERE post_id = ?",
            [$postId]
        );
        return $row ? (int) $row[$field] : 0;
    }
    public static function exists(mixed $arg1, mixed $arg2, mixed $arg3) {
        return Query::exists(
            "SELECT 1 FROM $table WHERE post_id = ? AND user_id = ? LIMIT 1",
            [$postId, $userId ?? Session::id()]
        );
    }
    public static function toggle(mixed $arg1, mixed $arg2, mixed $arg3, mixed $arg4) {
        if (self::check($table, $postId, $userId)) {
            self::delete($table, $type, $postId, $userId);
            return false;
        }
        self::create($table, $type, $postId, $userId);
        return true;
    }
    public static function list(mixed $arg1, mixed $arg2, mixed $arg3) {
        $id = $userId ?? Session::id();
        $sql = 
            'SELECT p.*, a.username
            FROM '.$table.' r
            INNER JOIN dyscover_posts p ON p.id = r.post_id
            LEFT JOIN accounts a ON a.id = p.user_id
            WHERE r.user_id = ?
            AND p.status = ?';
        $params = [
            $id,
            'active'
        ];
        if ($visibility && $id !== Session::id()) {
            $sql .= " AND p.visibility = 'public'";
        }
        $sql .= ' ORDER BY r.created_at DESC';
        $rows = Query::fetchAll($sql, $params);
        $out = [];
        foreach ($rows as $row) {
            $out[] = Post::map($row);
        }
        return $out;
    }
}
class Comments
{
    private static $table = 'dyscover_post_comments';
    public static function list() {
        Request::allow(['GET']);
        Auth::requireLogin();
        $post = TableRelations::post();
        $rows = Query::fetchAll(
            'SELECT c.id, c.user_id, c.body, c.created_at, a.username
            FROM '.self::$table.' c
            LEFT JOIN accounts a ON a.id = c.user_id
            WHERE c.post_id = ?
            ORDER BY c.id ASC',
            [(int) $post['id']]
        );
        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'id' => (int) $row['id'],
                'user_id' => (int) $row['user_id'],
                'username' => $row['username'] ?? '',
                'avatar' => Avatar::url($row['username'] ?? ''),
                'body' => $row['body'],
                'created_at' => $row['created_at']
            ];
        }
        Response::success('OK', $out);
    }
    public static function add() {
        Request::allow(['POST']);
        Auth::requireLogin();
        $post = TableRelations::post();
        $body = trim((string) Request::value('body'));
        if ($body === '') {
            Response::badRequest('Empty comment');
        }
        if (mb_strlen($body) > 4000) {
            Response::badRequest('Comment too long');
        }
        $userId = Session::id();
        $postId = (int) $post['id'];
        TableRelations::create(
            self::$table,
            'comment',
            $postId,
            $userId,
            ['body' => $body]
        );
        $commentId = Query::lastId();
        if ((int) $post['user_id'] !== $userId) {
            $preview = mb_strlen($body) > 200
                ? mb_substr($body, 0, 197).'...'
                : $body;
            Activity::create(
                $post['user_id'],
                $userId,
                'comment',
                $postId,
                $preview
            );
        }
        Activity::notifyMentions(
            $body,
            $userId,
            $postId
        );
        Response::created('OK', [
            'id' => (int) $commentId,
            'comments' => TableRelations::count('comment', $postId)
        ]);
    }
}
class Likes
{
    private static $table = 'dyscover_post_likes';
    public static function toggle() {
        Request::allow(['POST']);
        Auth::requireLogin();
        $post = TableRelations::post();
        $liked = TableRelations::toggle(
            self::$table,
            'like',
            (int) $post['id'],
            Session::id()
        );
        Response::success('OK', [
            'liked' => $liked,
            'likes' => TableRelations::count('like', (int) $post['id'])
        ]);
    }
    public static function list() {
        Request::allow(['GET']);
        Auth::requireLogin();
        Response::success(
            'OK',
            TableRelations::list(self::$table)
        );
    }
}
class Saved
{
    private static $table = 'dyscover_post_saves';
    public static function toggle() {
        Request::allow(['POST']);
        Auth::requireLogin();
        $post = TableRelations::post();
        $saved = TableRelations::toggle(
            self::$table,
            'save',
            (int) $post['id'],
            Session::id()
        );
        Response::success('OK', [
            'saved' => $saved,
            'saves' => TableRelations::count('save', (int) $post['id'])
        ]);
    }
    public static function list() {
        Request::allow(['GET']);
        Auth::requireLogin();
        $username = trim((string) Request::value('username'));
        if ($username === '') {
            $userId = Session::id();
        } else {
            $account = Query::fetch(
                'SELECT id
                FROM accounts
                WHERE username = ?
                LIMIT 1',
                [$username]
            );
            if (!$account) {
                Response::notFound('User not found');
            }
            $userId = (int) $account['id'];
        }
        Response::success(
            'OK',
            TableRelations::list(
                self::$table,
                $userId,
                true
            )
        );
    }
}
class Share
{
    private static $table = 'dyscover_post_shares';
    public static function create(mixed $arg1, mixed $arg2) {
        TableRelations::create(
            self::$table,
            'share',
            $postId,
            $userId
        );
    }
    public static function delete(mixed $arg1, mixed $arg2) {
        TableRelations::delete(
            self::$table,
            'share',
            $postId,
            $userId
        );
    }
    public static function list() {
        Request::allow(['GET']);
        Auth::requireLogin();
        Response::success(
            'OK',
            TableRelations::list(self::$table)
        );
    }
}
class Views
{
    private static $table = 'dyscover_post_views';
    public static function add() {
        Request::allow(['POST']);
        Auth::requireLogin();
        $post = TableRelations::post();
        $postId = (int) $post['id'];
        $userId = Session::id();
        $exists = Query::exists(
            'SELECT 1
            FROM '.self::$table.'
            WHERE post_id = ?
            AND user_id = ?
            AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
            LIMIT 1',
            [$postId, $userId]
        );
        if (!$exists) {
            TableRelations::create(
                self::$table,
                'view',
                $postId,
                $userId
            );
        }
        Response::success('OK', [
            'viewed' => true,
            'views' => TableRelations::count('view', $postId)
        ]);
    }
    public static function list() {
        Request::allow(['GET']);
        Auth::requireLogin();
        Response::success(
            'OK',
            TableRelations::list(self::$table)
        );
    }
    public static function count(mixed $arg1) {
        return TableRelations::count(
            'view',
            $postId
        );
    }
}
class Tags
{
    private static $table = 'dyscover_tags';
    private static $relation = 'dyscover_post_tags';
    public static function create(mixed $arg1, mixed $arg2) {
        if (!is_array($tags)) {
            return;
        }
        foreach ($tags as $tag) {
            $tag = Auth::normalize($tag);
            if ($tag === null) {
                continue;
            }
            $tagId = self::id($tag);
            Query::execute(
                'INSERT IGNORE INTO '.self::$relation.'(post_id, tag_id) VALUES(?, ?)',
                [$postId, $tagId]
            );
        }
    }
    private static function id($name)
    {
        $row = Query::fetch(
            'SELECT id
            FROM '.self::$table.'
            WHERE name = ?
            LIMIT 1',
            [$name]
        );
        if ($row) {
            return (int) $row['id'];
        }
        Query::execute(
            'INSERT INTO '.self::$table.'(name) VALUES(?)',
            [$name]
        );
        return Query::lastId();
    }
    public static function get(mixed $arg1) {
        return Query::fetchAll(
            'SELECT t.name
            FROM '.self::$relation.' pt
            INNER JOIN '.self::$table.' t ON t.id = pt.tag_id
            WHERE pt.post_id = ?
            ORDER BY t.name ASC',
            [$postId]
        );
    }
    public static function update(mixed $arg1, mixed $arg2) {
        Query::execute(
            'DELETE FROM '.self::$relation.' WHERE post_id = ?',
            [$postId]
        );
        self::create($postId, $tags);
    }
    public static function list() {
        Request::allow(['GET']);
        Auth::requireLogin();
        Response::success(
            'OK',
            Query::fetchAll(
                'SELECT id, name, created_at
                FROM '.self::$table.'
                ORDER BY name ASC'
            )
        );
    }
}
class Post
{
    public static $types = ['article', 'image', 'video', 'audio', 'document', 'template'];
    public $type;
    private $id;
    public $file;
    public $title;
    public $description;
    public $tags = [];
    public $fields = [];
    public function __construct()
    {
        $this->type = trim((string) Request::value('type'));
        if (!in_array($this->type, self::$types, true)) {
            Response::badRequest('Invalid post type');
        }
    }
    public function create() {
        Request::allow(['POST']);
        Auth::requireLogin();
        $this->loadData();
        if ($this->title === '') {
            Response::badRequest('Missing title');
        }
        $media = Request::file('media');
        $userId = Session::id();
        $this->file = $this->generateFile($media);
        $this->newRow();
        if ($this->type === 'article') {
            Article::create($userId, $this->file);
        }
        if ($this->isMedia()) {
            Media::create($userId, $this->type, $this->file, $media);
        }
        if ($this->type === 'template') {
            Template::create($this->id, $this->fields);
        }
        Tags::create($this->id, $this->tags);
        Response::created($this->type.' has been created');
    }
    public function update() {
        Request::allow(['POST', 'PUT', 'PATCH']);
        Auth::requireLogin();
        $file = trim((string) Request::value('file'));
        if ($file === '') {
            Response::badRequest('Missing file');
        }
        $row = self::rowByFile($file);
        if (!$row) {
            Response::notFound('Post not found');
        }
        $this->id = (int) $row['id'];
        $this->file = $file;
        $this->loadData();
        if ($this->title === '') {
            Response::badRequest('Missing title');
        }
        $media = Request::file('media');
        if ($this->isMedia()) {
            $newFile = $this->mediaFile($file, $media);
            Media::update(
                $row['user_id'],
                $this->type,
                $file,
                $newFile,
                $media
            );
            $this->file = $newFile;
        }
        if ($this->type === 'template') {
            Template::update(
                $this->id,
                $this->fields
            );
        }
        Tags::update($this->id, $this->tags);
        Query::execute(
            'UPDATE dyscover_posts
            SET file = ?, title = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?',
            [
                $this->file,
                $this->title,
                $this->description,
                $this->id
            ]
        );
        Response::success($this->type.' has been updated');
    }
    public function delete() {
        Request::allow(['DELETE', 'POST']);
        Auth::requireLogin();
        $file = trim((string) Request::value('file'));
        $row = self::rowByFile($file);
        if (!$row) {
            Response::notFound('Post not found');
        }
        if ($row['type'] === 'article') {
            Article::delete($row['user_id'], $file);
        }
        if (in_array($row['type'], ['image', 'video', 'audio', 'document'], true)) {
            Media::delete($row['user_id'], $row['type'], $file);
        }
        if ($row['type'] === 'template') {
            Template::delete((int) $row['id'], $row['file']);
        }
        Query::execute(
            'DELETE FROM dyscover_posts WHERE id = ?',
            [(int) $row['id']]
        );
        Response::success($row['type'].' has been deleted');
    }
    private function loadData()
    {
        $this->title = trim((string) Request::value('title'));
        $this->description = trim((string) Request::value('description'));
        $this->tags = Request::value('tags', []);
        $this->fields = Request::value('fields', []);
    }
    private function generateFile($media = null)
    {
        if ($this->type === 'article') {
            return $this->uniqueFile('.html');
        }
        if ($this->type === 'template') {
            return $this->uniqueFile('.json');
        }
        if ($this->isMedia()) {
            $extension = strtolower(pathinfo($media['name'] ?? '', PATHINFO_EXTENSION));
            if ($extension === '') {
                Response::badRequest('Invalid media extension');
            }
            return $this->uniqueFile('.'.$extension);
        }
        return null;
    }
    private function uniqueFile($extension)
    {
        do {
            $file = bin2hex(random_bytes(8)).$extension;
        } while (
            Query::fetch(
                'SELECT id FROM dyscover_posts WHERE file = ? LIMIT 1',
                [$file]
            )
        );
        return $file;
    }
    private function mediaFile($oldFile, $media)
    {
        if (!$media || !isset($media['name'])) {
            return $oldFile;
        }
        $oldExtension = pathinfo($oldFile, PATHINFO_EXTENSION);
        $newExtension = strtolower(pathinfo($media['name'], PATHINFO_EXTENSION));
        if ($oldExtension === $newExtension) {
            return $oldFile;
        }
        return pathinfo($oldFile, PATHINFO_FILENAME).'.'.$newExtension;
    }
    private function isMedia()
    {
        return in_array($this->type, ['image', 'video', 'audio', 'document'], true);
    }
    private function newRow()
    {
        $this->uniqueTitle();
        Query::execute(
            'INSERT INTO dyscover_posts
            (user_id, type, title, description, file, preview_image)
            VALUES (?, ?, ?, ?, ?, ?)',
            [
                Session::id(),
                $this->type,
                $this->title,
                $this->description,
                $this->file,
                $this->setPreviewImage()
            ]
        );
        $this->id = Query::lastId();
        Query::execute(
            'INSERT INTO dyscover_post_analytics
            (post_id)
            VALUES (?)',
            [
                $this->id
            ]
        );
    }
    private function uniqueTitle()
    {
        if (!in_array($this->type, ['article', 'template'], true)) {
            return;
        }
        $title = $this->title;
        $index = 1;
        while (Query::fetch(
            'SELECT id FROM dyscover_posts WHERE title = ? LIMIT 1',
            [$this->title]
        )) {
            $this->title = $title.' '.$index;
            $index++;
        }
    }
    public function setPreviewImage() {
        if ($this->type === 'article' || $this->type === 'template') {
            $image = trim((string) Request::value('preview-image'));
            if (Validate::required($image)) {
                return $image;
            }
            return APP_URL.'/media/no-article-image.jpg';
        }
        return null;
    }
    public static function data() {
        Request::allow(['GET']);
        Response::success(
            'OK',
            self::map(TableRelations::post())
        );
    }
    public static function map(mixed $arg1) {
        $viewerId = Session::id();
        $postId = (int) $row['id'];
        $mapped = [
            'id' => $postId,
            'user_id' => (int) $row['user_id'],
            'username' => $row['username'] ?? '',
            'type' => $row['type'],
            'title' => $row['title'] ?? '',
            'file' => basename($row['file'] ?? ''),
            'url' => self::url(
                $row['type'],
                $row['title'] ?? '',
                $row['file'] ?? '',
                $row['user_id']
            ),
            'description' => $row['description'] ?? '',
            'preview_image' => $row['preview_image'] ?? '',
            'visibility' => $row['visibility'],
            'tags' => Tags::get($postId),
            'likes' => (int) $row['likes'],
            'comments' => !empty($row['allow_comments']) ? (int) $row['comments'] : null,
            'shares' => !empty($row['allow_shares']) ? (int) $row['shares'] : null,
            'views' => (int) $row['views'],
            'allow_comments' => (bool) $row['allow_comments'],
            'allow_shares' => (bool) $row['allow_shares'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
            'liked' => false,
            'saved' => false
        ];
        if ($viewerId) {
            $mapped['liked'] = TableRelations::check(
                'dyscover_post_likes',
                $postId,
                $viewerId
            );
            $mapped['saved'] = TableRelations::check(
                'dyscover_post_saves',
                $postId,
                $viewerId
            );
        }
        if ($row['type'] === 'template') {
            $mapped['fields'] = Template::getFields($postId);
        }
        return $mapped;
    }
    private static function url($type, $title, $file, $userId)
    {
        if ($file === '') {
            return '';
        }
        if ($type === 'article') {
            return APP_URL.'/article/'.rawurlencode(pathinfo($file, PATHINFO_FILENAME));
        }
        return APP_URL.'/u/'.$userId.'/'.$type.'/'.rawurlencode($file);
    }
    public static function rowByFile(mixed $arg1) {
        return Query::fetch(
            'SELECT *
            FROM dyscover_posts
            WHERE file = ?
            AND status = ?
            LIMIT 1',
            [
                $file,
                'active'
            ]
        );
    }
}
