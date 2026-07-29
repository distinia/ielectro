<?php
namespace Admin;
use Nesh\Image;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Session;
class News
{
    public static function list() {
        Request::allow(['GET']);
        Data::ensureNewsCodes();
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $perPage = 25;
        $offset = ($page - 1) * $perPage;
        $rows = Query::fetchAll("SELECT code AS news_code,title,body,image,published_at,created_at FROM news WHERE status = 1 AND code IS NOT NULL ORDER BY id DESC LIMIT $perPage OFFSET $offset");
        foreach ($rows as &$row) {
            $row['image'] = Data::newsImagePublicUrl($row['image']);
        }
        unset($row);
        $total = Query::count("SELECT COUNT(*) FROM news WHERE status = 1");
        Response::success('News loaded', ['page' => $page, 'per_page' => $perPage, 'total' => $total, 'items' => $rows]);
    }
    public static function latest() {
        Request::allow(['GET']);
        Data::ensureNewsCodes();
        $limit = (int) ($_GET['limit'] ?? 5);
        if ($limit <= 0) {
            $limit = 5;
        }
        if ($limit > 12) {
            $limit = 12;
        }
        $rows = Query::fetchAll("SELECT code AS news_code,title,body,image,published_at,created_at FROM news WHERE status = 1 AND code IS NOT NULL ORDER BY id DESC LIMIT $limit");
        foreach ($rows as &$row) {
            $row['image'] = Data::newsImagePublicUrl($row['image']);
        }
        unset($row);
        Response::success('Latest news loaded', ['items' => $rows]);
    }
    public static function byCode() {
        Request::allow(['GET']);
        Data::ensureNewsCodes();
        $code = Data::clean($_GET['code'] ?? '');
        if (!preg_match('/^[a-zA-Z0-9]{16}$/', $code)) {
            Response::badRequest('Invalid news code');
        }
        $row = Query::fetch("SELECT code AS news_code,title,body,image,published_at,created_at FROM news WHERE status = 1 AND code = ? LIMIT 1", [$code]);
        if (!$row) {
            Response::notFound('News not found');
        }
        $row['image'] = Data::newsImagePublicUrl($row['image']);
        Response::success('News loaded', $row);
    }
    public static function uploadCover() {
        Auth::requirePrivileged();
        Request::allow(['POST']);
        $code = Data::clean($_POST['code'] ?? '');
        if (!preg_match('/^[a-zA-Z0-9]{16}$/', $code)) {
            Response::badRequest('Invalid code');
        }
        if (!Query::fetch("SELECT id FROM news WHERE code = ? LIMIT 1", [$code])) {
            Response::badRequest('Unknown news code');
        }
        $file = Request::file('image');
        if (!$file || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::badRequest('Image required');
        }
        $ext = Media::imageExt($file['name']);
        Media::assertUploadedImage((string) $file['tmp_name']);
        $dir = Media::mediaDir('news');
        $filename = $code.'.'.$ext;
        foreach (glob($dir.'/'.$code.'.*') ?: [] as $old) {
            @unlink($old);
        }
        $dest = $dir.'/'.$filename;
        if (!move_uploaded_file((string) $file['tmp_name'], $dest)) {
            Response::error('Upload failed');
        }
        Query::execute("UPDATE news SET image = ? WHERE code = ?", [$filename, $code]);
        Response::success('Uploaded', ['file' => $filename, 'url' => Data::newsImagePublicUrl($filename)]);
    }
    public static function adminList() {
        Auth::requirePrivileged();
        Request::allow(['GET']);
        $rows = Query::fetchAll("SELECT id,title,body,status,image,published_at,code AS news_code,created_at FROM news ORDER BY id DESC");
        foreach ($rows as &$row) {
            $row['image'] = Data::newsImagePublicUrl($row['image']);
        }
        unset($row);
        return $rows;
    }
    public static function adminItem() {
        Auth::requirePrivileged();
        Request::allow(['GET']);
        $id = (int) ($_GET['id'] ?? 0);
        if ($id <= 0) {
            Response::badRequest('Invalid id');
        }
        $row = Query::fetch("SELECT id,title,body,status,image,published_at,code AS news_code,created_at FROM news WHERE id = ? LIMIT 1", [(string) $id]);
        if (!$row) {
            Response::notFound('Not found');
        }
        $raw = $row['image'];
        $row['image_filename'] = Data::filenameOnly($raw);
        $row['image'] = Data::newsImagePublicUrl($raw);
        return $row;
    }
    public static function save() {
        Auth::requirePrivileged();
        Request::allow(['POST']);
        $input = Request::input();
        $id = (int) ($input['id'] ?? 0);
        $title = Data::clean($input['title'] ?? '');
        $body = Data::clean($input['body'] ?? '');
        $imageInput = Data::clean($input['image'] ?? '');
        $isActive = in_array($input['status'] ?? '1', ['1', 'true'], true) ? 1 : 0;
        $image = preg_match('#^https?://#i', $imageInput) ? $imageInput : Data::filenameOnly($imageInput);
        if ($title === '') {
            Response::badRequest('Title is required');
        }
        if ($body === '') {
            Response::badRequest('Body is required');
        }
        if ($id > 0) {
            // handle uploaded image on update
            $file = Request::file('image');
            if ($file && (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                $ext = Media::imageExt($file['name']);
                Media::assertUploadedImage((string) $file['tmp_name']);
                $dir = Media::mediaDir('news');
                $filename = (string) $id.'.'.$ext;
                foreach (glob($dir.'/'.$id.'.*') ?: [] as $old) {
                    @unlink($old);
                }
                $dest = $dir.'/'.$filename;
                if (!move_uploaded_file((string) $file['tmp_name'], $dest)) {
                    Response::error('Upload failed');
                }
                $image = $filename;
            }
            Query::execute("UPDATE news SET title = ?, body = ?, image = ?, status = ? WHERE id = ?", [$title, $body, $image, (string) $isActive, (string) $id]);
            Response::success('News updated');
        }
        do {
            $code = Data::randomCode();
        } while (Query::count("SELECT COUNT(*) FROM news WHERE code = ?", [$code]) > 0);
        $authorId = Session::id();
        $file = Request::file('image');
        if ($file && (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
            $ext = Media::imageExt($file['name']);
            Media::assertUploadedImage((string) $file['tmp_name']);
            $dir = Media::mediaDir('news');
            $filename = $code.'.'.$ext;
            foreach (glob($dir.'/'.$code.'.*') ?: [] as $old) {
                @unlink($old);
            }
            $dest = $dir.'/'.$filename;
            if (!move_uploaded_file((string) $file['tmp_name'], $dest)) {
                Response::error('Upload failed');
            }
            $image = $filename;
        }
        Query::execute("INSERT INTO news(author_id,title,body,image,status,code) VALUES(?,?,?,?,?,?)", [$authorId !== null ? (string) $authorId : null, $title, $body, $image, (string) $isActive, $code]);
        Response::created('News created', ['id' => (string) Query::lastId(), 'news_code' => $code]);
    }
    public static function delete() {
        Auth::requirePrivileged();
        Request::allow(['POST']);
        $id = (int) ($_POST['id'] ?? 0);
        if ($id <= 0) {
            Response::badRequest('Invalid id');
        }
        $row = Query::fetch("SELECT code, image FROM news WHERE id = ? LIMIT 1", [(string) $id]);
        if ($row) {
            $fn = Data::filenameOnly($row['image'] ?? '');
            if ($fn !== '') {
                @unlink(Data::projectRoot().'/content/news/'.$fn);
            } elseif (!empty($row['code'])) {
                Media::unlinkGlob(Data::projectRoot().'/content/news/'.$row['code'].'.*');
            }
        }
        Query::execute("DELETE FROM news WHERE id = ?", [(string) $id]);
        Response::success('News deleted');
    }
}
