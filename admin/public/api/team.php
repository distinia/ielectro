<?php
namespace Admin;
use Nesh\Image;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
class Team
{
    public static function list() {
        Request::allow(['GET']);
        $rows = Query::fetchAll("SELECT id,full_name,role_text,avatar,instagram,linkedin,github,created_at FROM team WHERE status = 1 ORDER BY id DESC");
        foreach ($rows as &$row) {
            $row['avatar'] = Data::teamAvatarPublicUrl($row['avatar']);
        }
        unset($row);
        Response::success('Team loaded', $rows);
    }
    public static function uploadAvatar() {
        Auth::requirePrivileged();
        Request::allow(['POST']);
        $id = (int) ($_POST['member_id'] ?? 0);
        if ($id <= 0) {
            Response::badRequest('member_id required');
        }
        if (!Query::fetch("SELECT id FROM team WHERE id = ? LIMIT 1", [(string) $id])) {
            Response::badRequest('Invalid member');
        }
        $file = Request::file('image');
        if (!$file || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::badRequest('Image required');
        }
        $ext = Media::imageExt($file['name']);
        Media::assertUploadedImage((string) $file['tmp_name']);
        $dir = Media::mediaDir('team');
        $filename = (string) $id.'.'.$ext;
        foreach (glob($dir.'/'.$id.'.*') ?: [] as $old) {
            @unlink($old);
        }
        $dest = $dir.'/'.$filename;
        if (!move_uploaded_file((string) $file['tmp_name'], $dest)) {
            Response::error('Upload failed');
        }
        Query::execute("UPDATE team SET avatar = ? WHERE id = ?", [$filename, (string) $id]);
        Response::success('Uploaded', ['file' => $filename, 'url' => Data::teamAvatarPublicUrl($filename)]);
    }
    public static function adminList() {
        Auth::requirePrivileged();
        Request::allow(['GET']);
        $rows = Query::fetchAll("SELECT id,full_name AS title,role_text AS body,status,avatar,instagram,linkedin,github,created_at FROM team ORDER BY id DESC");
        foreach ($rows as &$row) {
            $row['avatar'] = Data::teamAvatarPublicUrl($row['avatar']);
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
        $row = Query::fetch("SELECT id,full_name AS title,role_text AS body,status,avatar,instagram,linkedin,github,created_at FROM team WHERE id = ? LIMIT 1", [(string) $id]);
        if (!$row) {
            Response::notFound('Not found');
        }
        $raw = $row['avatar'];
        $row['avatar_filename'] = Data::filenameOnly($raw);
        $row['avatar'] = Data::teamAvatarPublicUrl($raw);
        return $row;
    }
    public static function save() {
        Auth::requirePrivileged();
        Request::allow(['POST']);
        $input = Request::body();
        $id = (int) ($input['id'] ?? 0);
        $title = Data::clean($input['title'] ?? '');
        $body = Data::clean($input['body'] ?? '');
        $active = in_array($input['status'] ?? '1', ['1', 'true'], true) ? 1 : 0;
        $avatar = Data::filenameOnly($input['avatar'] ?? '');
        $instagram = Data::clean($input['instagram'] ?? '');
        $linkedin = Data::clean($input['linkedin'] ?? '');
        $github = Data::clean($input['github'] ?? '');
        if ($title === '') {
            Response::badRequest('Name is required');
        }
        if ($body === '') {
            Response::badRequest('Role is required');
        }
        if ($id > 0) {
            // handle uploaded avatar on update
            $file = Request::file('image') ?: Request::file('avatar');
            if ($file && (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                $ext = Media::imageExt($file['name']);
                Media::assertUploadedImage((string) $file['tmp_name']);
                $dir = Media::mediaDir('team');
                $filename = (string) $id.'.'.$ext;
                foreach (glob($dir.'/'.$id.'.*') ?: [] as $old) {
                    @unlink($old);
                }
                $dest = $dir.'/'.$filename;
                if (!move_uploaded_file((string) $file['tmp_name'], $dest)) {
                    Response::error('Upload failed');
                }
                $avatar = $filename;
            }
            Query::execute("UPDATE team SET full_name = ?, role_text = ?, status = ?, avatar = ?, instagram = ?, linkedin = ?, github = ? WHERE id = ?", [$title, $body, (string) $active, $avatar, $instagram, $linkedin, $github, (string) $id]);
            Response::success('Team member updated');
        }
        Query::execute("INSERT INTO team(full_name,role_text,avatar,instagram,linkedin,github,status) VALUES(?,?,?,?,?,?,?)", [$title, $body, $avatar, $instagram, $linkedin, $github, (string) $active]);
        $newId = Query::lastId();
        // handle uploaded avatar on create (use new id)
        $file = Request::file('image') ?: Request::file('avatar');
        if ($file && (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
            $ext = Media::imageExt($file['name']);
            Media::assertUploadedImage((string) $file['tmp_name']);
            $dir = Media::mediaDir('team');
            $filename = (string) $newId.'.'.$ext;
            foreach (glob($dir.'/'.$newId.'.*') ?: [] as $old) {
                @unlink($old);
            }
            $dest = $dir.'/'.$filename;
            if (!move_uploaded_file((string) $file['tmp_name'], $dest)) {
                Response::error('Upload failed');
            }
            Query::execute("UPDATE team SET avatar = ? WHERE id = ?", [$filename, (string) $newId]);
        }
        Response::created('Team member created', ['id' => (string) $newId]);
    }
    public static function delete() {
        Auth::requirePrivileged();
        Request::allow(['POST']);
        $id = (int) ($_POST['id'] ?? 0);
        if ($id <= 0) {
            Response::badRequest('Invalid id');
        }
        Media::unlinkGlob(Data::projectRoot().'/content/team/'.$id.'.*');
        Query::execute("DELETE FROM team WHERE id = ?", [(string) $id]);
        Response::success('Team member deleted');
    }
}
