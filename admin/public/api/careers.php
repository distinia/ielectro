<?php
namespace Admin;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Validate;
class Careers
{
    public static function submit() {
        Request::allow(['POST']);
        $input = Request::body();
        $fullName = Data::clean($input['fullName'] ?? '');
        $email = Data::clean($input['email'] ?? '');
        $position = Data::clean($input['position'] ?? '');
        if ($fullName === '' || $email === '' || $position === '') {
            Response::badRequest('Fill all required fields');
        }
        if (!Validate::email($email)) {
            Response::badRequest('Invalid email');
        }
        $cv = Request::file('cv');
        $cvName = '';
        if ($cv && ($cv['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
            $ext = strtolower(pathinfo((string) ($cv['name'] ?? ''), PATHINFO_EXTENSION));
            if ($ext !== 'pdf') {
                Response::badRequest('CV must be a PDF file');
            }
            $targetDir = Data::projectRoot().'/content/job-application';
            if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true)) {
                Response::error('Unable to create CV folder');
            }
            $cvName = 'cv_'.date('Ymd_His').'_'.bin2hex(random_bytes(5)).'.pdf';
            $targetPath = $targetDir.'/'.$cvName;
            if (!move_uploaded_file((string) $cv['tmp_name'], $targetPath)) {
                Response::error('Unable to save CV');
            }
        }
        Query::execute("INSERT INTO ielectro_job_applications(full_name,email,position,cv_file,status) VALUES(?,?,?,?,?)", [$fullName, $email, $position, $cvName, 'new']);
        Response::created('Application sent successfully');
    }
    public static function listPublic() {
        Request::allow(['GET']);
        $rows = Query::fetchAll("SELECT id,slug,title,location,employment_type,description,requirements FROM careers WHERE (status = 'active' OR status = 1) ORDER BY id DESC");
        $jobs = [];
        foreach ($rows as $row) {
            $req = [];
            if (!empty($row['requirements'])) {
                $decoded = json_decode((string) $row['requirements'], true);
                if (is_array($decoded)) {
                    $req = $decoded;
                } else {
                    $req = array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', (string) $row['requirements']))));
                }
            }
            $jobs[] = ['id' => (string) ($row['id'] ?? ''), 'slug' => $row['slug'] ?? '', 'title' => $row['title'] ?? '', 'location' => $row['location'] ?? '', 'employment_type' => $row['employment_type'] ?? '', 'description' => $row['description'] ?? '', 'requirements' => $req];
        }
        Response::success('Jobs loaded', ['jobs' => $jobs]);
    }
    public static function deleteCv() {
        Auth::requirePrivileged();
        Request::allow(['POST']);
        $id = (int) ($_POST['id'] ?? 0);
        if ($id <= 0) {
            Response::badRequest('Invalid id');
        }
        $row = Query::fetch("SELECT cv_file FROM ielectro_job_applications WHERE id = ? LIMIT 1", [(string) $id]);
        if (!$row) {
            Response::notFound('Application not found');
        }
        $cvFile = Data::filenameOnly($row['cv_file'] ?? '');
        if ($cvFile !== '') {
            @unlink(Data::projectRoot().'/content/job-application/'.$cvFile);
        }
        Query::execute("UPDATE ielectro_job_applications SET cv_file = NULL WHERE id = ?", [(string) $id]);
        Response::success('CV deleted');
    }
    public static function adminApplications() {
        Auth::requirePrivileged();
        Request::allow(['GET']);
        return Query::fetchAll("SELECT id,full_name,email,position,cv_file,status,created_at FROM ielectro_job_applications ORDER BY id DESC LIMIT 250");
    }
    public static function adminList() {
        Auth::requirePrivileged();
        Request::allow(['GET']);
        return Query::fetchAll("SELECT id,slug,title,location,employment_type,description,requirements,status,created_at,updated_at FROM careers ORDER BY id DESC");
    }
    public static function adminItem() {
        Auth::requirePrivileged();
        Request::allow(['GET']);
        $id = (int) ($_GET['id'] ?? 0);
        if ($id <= 0) {
            Response::badRequest('Invalid id');
        }
        $row = Query::fetch("SELECT id,slug,title,location,employment_type,description,requirements,status,created_at,updated_at FROM careers WHERE id = ? LIMIT 1", [(string) $id]);
        if (!$row) {
            Response::notFound('Not found');
        }
        return $row;
    }
    public static function saveContent() {
        Auth::requirePrivileged();
        Request::allow(['POST']);
        $input = Request::body();
        $id = (int) ($input['id'] ?? 0);
        $title = Data::clean($input['title'] ?? '');
        $slug = Data::clean($input['slug'] ?? '');
        $location = Data::clean($input['location'] ?? '');
        $employmentType = Data::clean($input['employment_type'] ?? 'full_time');
        $body = Data::clean($input['description'] ?? '');
        $active = in_array($input['status'] ?? '1', ['1', 'true'], true) ? 1 : 0;
        $requirementsRaw = $input['requirements'] ?? $input['requirements_raw'] ?? $body;
        $requirements = is_array($requirementsRaw) ? $requirementsRaw : array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', (string) $requirementsRaw))));
        if ($title === '') {
            Response::badRequest('Title is required');
        }
        $requirementsJson = json_encode($requirements, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($slug === '') {
            $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $title), '-'));
        }
        if ($id > 0) {
            Query::execute("UPDATE careers SET slug = ?, title = ?, location = ?, employment_type = ?, description = ?, requirements = ?, status = ? WHERE id = ?", [strtolower($slug), $title, $location, $employmentType, $body, $requirementsJson, (string) $active, (string) $id]);
            Response::success('Career updated');
        }
        Query::execute("INSERT INTO careers(slug,title,location,employment_type,description,requirements,status) VALUES(?,?,?,?,?,?,?)", [strtolower($slug), $title, $location, $employmentType, $body, $requirementsJson, (string) $active]);
        Response::created('Career created', ['id' => (string) Query::lastId()]);
    }
    public static function deleteContent() {
        Auth::requirePrivileged();
        Request::allow(['POST']);
        $id = (int) ($_POST['id'] ?? 0);
        if ($id <= 0) {
            Response::badRequest('Invalid id');
        }
        Query::execute("DELETE FROM careers WHERE id = ?", [(string) $id]);
        Response::success('Career deleted');
    }
    public static function deleteApplication() {
        Auth::requirePrivileged();
        Request::allow(['POST']);
        $id = (int) ($_POST['id'] ?? 0);
        if ($id <= 0) {
            Response::badRequest('Invalid id');
        }
        $row = Query::fetch("SELECT cv_file FROM ielectro_job_applications WHERE id = ? LIMIT 1", [(string) $id]);
        if (!$row) {
            Response::notFound('Application not found');
        }
        $cvFile = Data::filenameOnly($row['cv_file'] ?? '');
        if ($cvFile !== '') {
            @unlink(Data::projectRoot().'/content/job-application/'.$cvFile);
        }
        Query::execute("DELETE FROM ielectro_job_applications WHERE id = ?", [(string) $id]);
        Response::success('Application deleted');
    }
}
