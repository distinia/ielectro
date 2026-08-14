<?php
namespace Admin;
use Nesh\File;
use Nesh\Generate;
use Nesh\Identity;
use Nesh\Mail;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
use Nesh\Validate;
use Nesh\RateLimit;

require_once __DIR__ . '/access.php';
require_once __DIR__ . '/paths.php';
class Careers
{
    private Create $create;
    private Data $data;
    private Update $update;
    private Delete $delete;
    public function __construct()
    {
        $this->create = new Create();
        $this->data = new Data();
        $this->update = new Update();
        $this->delete = new Delete();
    }
    public function index(): void
    {
        Routing::method([
            'GET'    => fn() => Routing::id()
                ? $this->data->one()
                : $this->data->list(),
            'POST'   => fn() => $this->create->index(),
            'PATCH'  => fn() => $this->update->index(),
            'DELETE' => fn() => $this->delete->index(),
        ]);
    }
    public function apply(): void
    {
        (new Apply())->index();
    }
    public function applications(): void
    {
        (new Applications())->index();
    }
}
class Create
{
    public function index(): void
    {
        Request::post();
        Access::requireMember();
        $listing = CareerFields::validate(Request::body());
        Query::execute(
            "INSERT INTO ielectro_admin.careers(
                title,
                location,
                employment_type,
                description,
                requirements,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?)",
            [
                $listing['title'],
                $listing['location'] !== '' ? $listing['location'] : null,
                $listing['employment_type'],
                $listing['description'],
                $listing['requirements_json'],
                $listing['status']
            ]
        );
        Response::created(['id' => Query::lastId()]);
    }
}
class Data
{
    public function list(): void
    {
        Request::get();
        $rows = Query::fetchAll(
            "SELECT
                id,
                title,
                location,
                employment_type,
                description,
                requirements,
                status,
                created_at,
                updated_at
            FROM ielectro_admin.careers
            ORDER BY id DESC"
        );
        Response::success(CareerFields::rows($rows));
    }
    public function one(): void
    {
        Request::get();
        $id = CareerFields::id();
        $row = Query::fetch(
            "SELECT
                id,
                title,
                location,
                employment_type,
                description,
                requirements,
                status,
                created_at,
                updated_at
            FROM ielectro_admin.careers
            WHERE id = ?
            LIMIT 1",
            [$id]
        );
        if (!$row) {
            Response::notFound('Career not found');
        }
        Response::success(CareerFields::row($row));
    }
}
class Update
{
    public function index(): void
    {
        Request::patch();
        Access::requireMember();
        $id = CareerFields::id();
        if (!Query::exists("SELECT 1 FROM ielectro_admin.careers WHERE id = ? LIMIT 1", [$id])) {
            Response::notFound('Career not found');
        }
        $input = Request::body();
        if (!$input) {
            Response::badRequest('No data provided');
        }
        $fields = [];
        $params = [];
        if (array_key_exists('title', $input)) {
            $title = trim((string) $input['title']);
            if (!Validate::required($title)) {
                Response::badRequest('Title is required');
            }
            $fields[] = 'title = ?';
            $params[] = $title;
        }
        if (array_key_exists('location', $input)) {
            $fields[] = 'location = ?';
            $params[] = trim((string) $input['location']) ?: null;
        }
        if (array_key_exists('employment_type', $input)) {
            $fields[] = 'employment_type = ?';
            $params[] = CareerFields::employmentType($input['employment_type']);
        }
        if (array_key_exists('description', $input)) {
            $fields[] = 'description = ?';
            $params[] = trim((string) $input['description']);
        }
        if (
            array_key_exists('requirements', $input)
            || array_key_exists('requirements_raw', $input)
        ) {
            $requirements = CareerFields::requirements(
                $input['requirements'] ?? $input['requirements_raw'] ?? ''
            );
            $fields[] = 'requirements = ?';
            $params[] = json_encode(
                $requirements,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            );
        }
        if (array_key_exists('status', $input)) {
            $fields[] = 'status = ?';
            $params[] = CareerFields::status($input['status']);
        }
        if (!$fields) {
            Response::success('Nothing changed');
        }
        $params[] = $id;
        Query::execute(
            "UPDATE ielectro_admin.careers
            SET " . implode(', ', $fields) . "
            WHERE id = ?",
            $params
        );
        Response::success('Career updated');
    }
}
class Delete
{
    public function index(): void
    {
        Request::delete();
        Access::requireMember();
        $id = CareerFields::id();
        if (!Query::exists("SELECT 1 FROM ielectro_admin.careers WHERE id = ? LIMIT 1", [$id])) {
            Response::notFound('Career not found');
        }
        Query::execute("DELETE FROM ielectro_admin.careers WHERE id = ?", [$id]);
        Response::success('Career deleted');
    }
}
class CareerFields
{
    public static function id(): int
    {
        $id = Routing::id();
        if ($id === null || $id <= 0) {
            Response::badRequest('Invalid id');
        }
        return $id;
    }
    public static function status(mixed $value): string
    {
        $value = strtolower(trim((string) $value));
        if (in_array($value, ['active', 'hidden'], true)) {
            return $value;
        }
        if (in_array($value, ['1', 'true'], true)) {
            return 'active';
        }
        if (in_array($value, ['0', 'false'], true)) {
            return 'hidden';
        }
        return 'active';
    }
    public static function employmentType(mixed $value): string
    {
        $value = strtolower(trim((string) $value));
        if ($value === '') {
            return 'full_time';
        }
        return $value;
    }
    public static function requirements(mixed $raw): array
    {
        if (is_array($raw)) {
            return array_values(array_filter(array_map(
                fn($item) => trim((string) $item),
                $raw
            )));
        }
        if (is_string($raw) && Validate::json($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return self::requirements($decoded);
            }
        }
        return array_values(array_filter(array_map(
            'trim',
            preg_split('/\r\n|\r|\n/', (string) $raw) ?: []
        )));
    }
    public static function validate(array $input): array
    {
        $title = trim((string) ($input['title'] ?? ''));
        if (!Validate::required($title)) {
            Response::badRequest('Title is required');
        }
        $requirements = self::requirements(
            $input['requirements'] ?? $input['requirements_raw'] ?? ''
        );
        $description = trim((string) ($input['description'] ?? ''));
        if ($description === '' && $requirements) {
            $description = implode("\n", $requirements);
        }
        return [
            'title' => $title,
            'location' => trim((string) ($input['location'] ?? '')),
            'employment_type' => self::employmentType($input['employment_type'] ?? 'full_time'),
            'description' => $description !== '' ? $description : $title,
            'requirements_json' => json_encode(
                $requirements,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
            'status' => self::status($input['status'] ?? 'active'),
        ];
    }
    public static function rows(array $rows): array
    {
        return array_map(
            fn(array $row): array => self::row($row),
            $rows
        );
    }
    public static function row(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'title' => $row['title'],
            'location' => $row['location'],
            'employment_type' => $row['employment_type'],
            'description' => $row['description'],
            'requirements' => self::requirements($row['requirements'] ?? '[]'),
            'status' => $row['status'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }
}
class Apply
{
    public function index(): void
    {
        Request::post();
        RateLimit::check('career_apply', 6, 900);
        $name = trim((string) Request::value('name'));
        $email = trim((string) Request::value('email'));
        $position = trim((string) Request::value('position'));
        $cv = Request::file('cv');
        if (
            !Validate::required($name)
            || !Validate::required($email)
            || !Validate::required($position)
        ) {
            Response::badRequest('All fields are required');
        }
        if (!Validate::email($email)) {
            Response::badRequest('Invalid email');
        }
        if (
            !$cv
            || (int) ($cv['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK
        ) {
            Response::badRequest('CV file is required');
        }
        $extension = strtolower(pathinfo((string) ($cv['name'] ?? ''), PATHINFO_EXTENSION));
        if ($extension !== 'pdf') {
            Response::badRequest('CV must be a PDF file');
        }
        $uuid = Generate::uuid();
        $directory = MediaPaths::applicationsDir();
        File::makeDirectory($directory);
        $filename = $uuid . '.pdf';
        $destination = $directory . '/' . $filename;
        if (!move_uploaded_file((string) $cv['tmp_name'], $destination)) {
            Response::error('Unable to upload CV');
        }
        Query::execute(
            "INSERT INTO ielectro_admin.career_applications(
                uuid,
                full_name,
                email,
                position,
                cv_file
            )
            VALUES (?, ?, ?, ?, ?)",
            [
                $uuid,
                $name,
                $email,
                $position,
                $filename,
            ]
        );
        Response::success('Application sent successfully');
    }
}
class Applications
{
    public function index(): void
    {
        Routing::method([
            'GET' => fn() => $this->list(),
            'PATCH' => fn() => $this->updateStatus(),
        ]);
    }

    private function list(): void
    {
        Request::get();
        Access::requireMember();
        $rows = Query::fetchAll(
            'SELECT
                id,
                uuid,
                full_name,
                email,
                phone_number,
                position,
                cv_file,
                status,
                created_at
            FROM ielectro_admin.career_applications
            ORDER BY created_at DESC, id DESC'
        );
        Response::success(ApplicationFields::rows($rows));
    }

    private function updateStatus(): void
    {
        Request::patch();
        Access::requireMember();
        $id = ApplicationFields::id();
        $input = Request::body();
        if (!$input || !array_key_exists('status', $input)) {
            Response::badRequest('Status is required');
        }
        $status = ApplicationFields::status($input['status']);
        $row = Query::fetch(
            'SELECT
                id,
                uuid,
                full_name,
                email,
                phone_number,
                position,
                cv_file,
                status,
                created_at
            FROM ielectro_admin.career_applications
            WHERE id = ?
            LIMIT 1',
            [$id]
        );
        if (!$row) {
            Response::notFound('Application not found');
        }
        $previous = (string) ($row['status'] ?? 'reviewing');
        if ($previous === $status) {
            Response::success(ApplicationFields::row($row));
        }
        $member = Access::member();
        Query::execute(
            'UPDATE ielectro_admin.career_applications
            SET status = ?, reviewed_by = ?, reviewed_at = NOW()
            WHERE id = ?',
            [
                $status,
                $member['account_id'] ?? Identity::id(),
                $id,
            ]
        );
        if ($status === 'accepted') {
            ApplicationMail::accepted(
                (string) $row['email'],
                (string) $row['full_name'],
                (string) $row['position']
            );
        } elseif ($status === 'rejected') {
            ApplicationMail::rejected(
                (string) $row['email'],
                (string) $row['full_name'],
                (string) $row['position']
            );
        }
        $updated = Query::fetch(
            'SELECT
                id,
                uuid,
                full_name,
                email,
                phone_number,
                position,
                cv_file,
                status,
                created_at
            FROM ielectro_admin.career_applications
            WHERE id = ?
            LIMIT 1',
            [$id]
        );
        Response::success(ApplicationFields::row($updated ?: $row));
    }
}
class ApplicationFields
{
    public static function id(): int
    {
        $id = Routing::id();
        if ($id === null || $id <= 0) {
            Response::badRequest('Invalid application id');
        }
        return $id;
    }

    public static function status(mixed $value): string
    {
        $value = strtolower(trim((string) $value));
        if (!in_array($value, ['reviewing', 'accepted', 'rejected'], true)) {
            Response::badRequest('Invalid status');
        }
        return $value;
    }

    public static function rows(array $rows): array
    {
        return array_map(
            fn(array $row): array => self::row($row),
            $rows
        );
    }

    public static function row(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'uuid' => $row['uuid'],
            'full_name' => $row['full_name'],
            'email' => $row['email'],
            'phone_number' => $row['phone_number'],
            'position' => $row['position'],
            'cv_file' => $row['cv_file'],
            'cv_url' => MediaPaths::applicationUrl($row['cv_file'] ?? null),
            'status' => $row['status'],
            'created_at' => $row['created_at'],
        ];
    }
}
class ApplicationMail
{
    public static function accepted(string $email, string $name, string $position): bool
    {
        $safeName = htmlspecialchars(trim($name) !== '' ? trim($name) : 'there', ENT_QUOTES, 'UTF-8');
        $safePosition = htmlspecialchars(trim($position), ENT_QUOTES, 'UTF-8');
        return Mail::html(
            $email,
            'Your application to iElectro',
            '
            <html>
            <body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.7">
                <h2 style="color:#0b1f3a;margin:0 0 16px">Thank you for applying</h2>
                <p>Hello <strong>' . $safeName . '</strong>,</p>
                <p>
                    Thank you for applying for the <strong>' . $safePosition . '</strong> role at iElectro.
                </p>
                <p>
                    After reviewing your application, we would like to move forward and invite you to a
                    brief introductory interview so we can get to know you better and discuss the opportunity.
                </p>
                <p>
                    Our team will contact you shortly with available dates and next steps.
                </p>
                <p>
                    Best regards,<br>
                    <strong>The iElectro Team</strong>
                </p>
            </body>
            </html>'
        );
    }

    public static function rejected(string $email, string $name, string $position): bool
    {
        $safeName = htmlspecialchars(trim($name) !== '' ? trim($name) : 'there', ENT_QUOTES, 'UTF-8');
        $safePosition = htmlspecialchars(trim($position), ENT_QUOTES, 'UTF-8');
        return Mail::html(
            $email,
            'Update on your iElectro application',
            '
            <html>
            <body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.7">
                <h2 style="color:#0b1f3a;margin:0 0 16px">Application update</h2>
                <p>Hello <strong>' . $safeName . '</strong>,</p>
                <p>
                    Thank you for your interest in the <strong>' . $safePosition . '</strong> role at iElectro
                    and for the time you took to apply.
                </p>
                <p>
                    After careful review, we will not be moving forward with your application at this time.
                </p>
                <p>
                    We appreciate your interest in iElectro and wish you the best in your search.
                </p>
                <p>
                    Best regards,<br>
                    <strong>The iElectro Team</strong>
                </p>
            </body>
            </html>'
        );
    }
}
