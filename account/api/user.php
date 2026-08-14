<?php
namespace Account;
use Nesh\Generate;
use Nesh\Password;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Strings;
use Nesh\Validate;
use Nesh\Identity;
use Nesh\Routing;
class User
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
            'GET'    => fn() => $this->data->index(),
            'POST'   => fn() => $this->create->index(),
            'PATCH'  => fn() => $this->update->index(),
            'DELETE' => fn() => $this->delete->index(),
        ]);
    }
    public function cancelDeletion(): void
    {
        $this->delete->cancel();
    }
}
class Create
{
    public function index(): void
    {
        Request::post();
        $account = $this->validate();
        $accountId = $this->insert($account);
        Services::create($accountId);
        Pending::delete();
        Session::create($accountId);
        Activity::log(
            $accountId,
            'register',
            'Account created.'
        );
        Response::created('Account created successfully');
    }
    private function validate(): array
    {
        $oauthSignup = Pending::get() !== null;
        $account = [
            'username' => Strings::normalize(Request::value('username')),
            'name' => trim((string) Request::value('name')),
            'surname' => trim((string) Request::value('surname')),
            'birthday' => trim((string) Request::value('birthday')),
            'gender' => trim((string) Request::value('gender')),
            'email' => Strings::normalize(Request::value('email')),
            'password' => (string) Request::value('password')
        ];
        if (!Validate::required($account['username'])) {
            $account['username'] = $this->generateUsername();
        }
        if (!Validate::required($account['password'])) {
            if ($oauthSignup) {
                $account['password'] = null;
            } else {
                Response::badRequest('Password is required');
            }
        }
        foreach ($account as $key => $value) {
            if ($key === 'password' && $value === null) {
                continue;
            }
            if (!Validate::required($value)) {
                Response::badRequest('All fields are required');
            }
        }
        if (!Validate::username($account['username'])) {
            Response::badRequest('Invalid username');
        }
        if (!Validate::email($account['email'])) {
            Response::badRequest('Invalid email');
        }
        if (!Validate::date($account['birthday'])) {
            Response::badRequest('Invalid birthday');
        }
        if (!Validate::in($account['gender'], ['Male', 'Female', 'Other'])) {
            Response::badRequest('Invalid gender');
        }
        if (
            $account['password'] !== null
            && !Validate::min($account['password'], 8)
        ) {
            Response::badRequest('Password must be at least 8 characters');
        }
        if (
            Query::exists(
                "SELECT 1
                FROM ielectro_account.accounts
                WHERE username = ?",
                [$account['username']]
            )
        ) {
            Response::conflict('Username already exists');
        }
        if (
            Query::exists(
                "SELECT 1
                FROM ielectro_account.accounts
                WHERE email = ?",
                [$account['email']]
            )
        ) {
            Response::conflict('Email already exists');
        }
        return $account;
    }
    private function insert(array $account): int
    {
        Query::begin();
        try {
            Query::execute(
                "INSERT INTO ielectro_account.accounts(
                    username,
                    name,
                    surname,
                    birthday,
                    gender,
                    email,
                    password_hash
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                    $account['username'],
                    $account['name'],
                    $account['surname'],
                    $account['birthday'],
                    $account['gender'],
                    $account['email'],
                    $account['password'] === null
                        ? null
                        : Password::hash($account['password'])
                ]
            );
            $accountId = Query::lastId();
            Query::commit();
            return $accountId;
        } catch (\Throwable $e) {
            Query::rollback();
            Response::error('Unable to create account');
        }
    }
    private function generateUsername(): string
    {
        do {
            $username = 'user' . random_int(10000000, 99999999);
        } while (
            Query::exists(
                "SELECT 1
                FROM ielectro_account.accounts
                WHERE username = ?",
                [$username]
            )
        );
        return $username;
    }
}
class Data
{
    public function index(): void
    {
        Request::get();
        $account = Query::fetch(
            "SELECT
                id,
                username,
                name,
                surname,
                birthday,
                gender,
                email,
                phone_number,
                created_at,
                deletion_scheduled_at,
                (password_hash IS NOT NULL) AS has_password
            FROM ielectro_account.accounts
            WHERE id = ?
            LIMIT 1",
            [Identity::id()]
        );
        if (!$account) {
            Response::notFound('Account not found');
        }
        $account['has_password'] = (bool) $account['has_password'];
        $accountId = (int) $account['id'];
        $account['avatar'] = \Nesh\Avatar::url($accountId);
        $account['avatar_custom'] = \Nesh\Avatar::isCustom($accountId);
        Response::success($account);
    }
}
class Update
{
    private const FIELDS = [
        'name' => [
            'column' => 'name',
            'validator' => 'required',
            'log' => 'Name changed'
        ],
        'surname' => [
            'column' => 'surname',
            'validator' => 'required',
            'log' => 'Surname changed'
        ],
        'birthday' => [
            'column' => 'birthday',
            'validator' => 'date',
            'log' => 'Birthday changed'
        ],
        'gender' => [
            'column' => 'gender',
            'validator' => 'gender',
            'log' => 'Gender changed'
        ],
        'phone_number' => [
            'column' => 'phone_number',
            'validator' => 'phone',
            'unique' => true,
            'activity' => 'phone_number_changed',
            'log' => 'Phone number changed'
        ],
        'email' => [
            'column' => 'email',
            'validator' => 'email',
            'unique' => true,
            'verify' => true,
            'activity' => 'email_changed',
            'log' => 'Email changed'
        ],
        'username' => [
            'column' => 'username',
            'validator' => 'username',
            'normalize' => true,
            'unique' => true,
            'activity' => 'username_changed',
            'log' => 'Username changed'
        ]
    ];
    public function index(): void
    {
        Request::patch();
        $input = Request::body();
        if (!$input) {
            Response::badRequest('No data provided');
        }
        $account = Query::fetch(
            "SELECT *
        FROM ielectro_account.accounts
        WHERE id = ?",
            [Identity::id()]
        );
        if (!$account) {
            Response::notFound('Account not found');
        }
        if (
            array_key_exists('password', $input)
            || array_key_exists('current_password', $input)
        ) {
            $this->password($input, $account);
        }
        $update = [];
        $params = [];
        $emailChanged = false;
        $usernameChanged = false;
        $oldUsername = '';
        $newUsername = '';
        foreach (self::FIELDS as $field => $config) {
            if (!array_key_exists($field, $input)) {
                continue;
            }
            $value = $this->prepare($field, $input[$field], $config);
            $this->validate($field, $value, $config);
            $this->unique($field, $value, $config);
            if ($value === $account[$config['column']]) {
                continue;
            }
            if ($field === 'username') {
                $usernameChanged = true;
                $oldUsername = (string) $account['username'];
                $newUsername = (string) $value;
            }
            $update[] = "{$config['column']} = ?";
            $params[] = $value;
            if (!empty($config['verify'])) {
                $update[] = "email_verified_at = NULL";
                $emailChanged = true;
            }
            Activity::log(
                Identity::id(),
                $config['activity'] ?? 'profile_updated',
                "{$config['log']}: {$account[$config['column']]} -> {$value}"
            );
        }
        if (!$update) {
            Response::success('Nothing changed');
        }
        $params[] = Identity::id();
        Query::execute(
            "UPDATE ielectro_account.accounts
        SET " . implode(', ', $update) . "
        WHERE id = ?",
            $params
        );
        if ($usernameChanged) {
            Dyscover::rewriteMentionUsername($oldUsername, $newUsername);
        }
        if ($emailChanged) {
            EmailVerification::send(Identity::id());
        }
        Response::success('Account updated');
    }
    private function password(array $input, array $account): void
    {
        $current = (string) ($input['current_password'] ?? '');
        $password = (string) ($input['password'] ?? '');
        $confirm = (string) ($input['confirm_password'] ?? '');
        $hasPassword = $account['password_hash'] !== null;

        if (
            !Validate::required($password)
            || !Validate::required($confirm)
        ) {
            Response::badRequest('New password and confirmation are required');
        }

        if ($hasPassword && !Validate::required($current)) {
            Response::badRequest('Current password is required');
        }

        if (!Validate::same($password, $confirm)) {
            Response::badRequest('Passwords do not match');
        }
        if (!Validate::min($password, 8)) {
            Response::badRequest('Password must be at least 8 characters');
        }
        if (
            $hasPassword
            && !Password::verify($current, $account['password_hash'])
        ) {
            Response::unauthorized('Current password is incorrect');
        }
        Query::execute(
            "UPDATE ielectro_account.accounts
            SET password_hash = ?
            WHERE id = ?",
            [
                Password::hash($password),
                Identity::id(),
            ]
        );
        Activity::log(
            Identity::id(),
            'password_changed',
            $hasPassword
                ? 'Password changed from profile'
                : 'Password set from profile'
        );
        Response::success(
            $hasPassword
                ? 'Password updated'
                : 'Password set successfully'
        );
    }
    private function prepare(string $field, mixed $value, array $config): mixed
    {
        if (is_string($value)) {
            $value = trim($value);
        }
        if (!empty($config['normalize'])) {
            $value = Strings::normalize($value);
        }
        return $value;
    }
    private function validate(string $field, mixed $value, array $config): void
    {
        if (!Validate::required($value)) {
            Response::badRequest(ucwords(str_replace('_', ' ', $field)) . ' is required');
        }
        switch ($config['validator']) {
            case 'username':
                if (!Validate::username($value)) {
                    Response::badRequest('Invalid username');
                }
                break;
            case 'email':
                if (!Validate::email($value)) {
                    Response::badRequest('Invalid email');
                }
                break;
            case 'phone':
                if (!Validate::phone($value)) {
                    Response::badRequest('Invalid phone number');
                }
                break;
            case 'date':
                if (!Validate::date($value)) {
                    Response::badRequest('Invalid birthday');
                } 
                break;
            case 'gender':
                if (!Validate::in($value, ['Male', 'Female', 'Other'])) {
                    Response::badRequest('Invalid gender');
                }
                break;
        }
    }
    private function unique(string $field, mixed $value, array $config): void
    {
        if (empty($config['unique'])) {
            return;
        }
        if (
            Query::exists(
                "SELECT 1
            FROM ielectro_account.accounts
            WHERE {$config['column']} = ?
            AND id <> ?",
                [
                    $value,
                    Identity::id()
                ]
            )
        ) {
            Response::conflict(
                ucwords(str_replace('_', ' ', $field)) . ' already exists'
            );
        }
    }
}
class Delete
{
    public function index(): void
    {
        Request::delete();
        Query::execute(
            "UPDATE ielectro_account.accounts
            SET deletion_scheduled_at = DATE_ADD(NOW(), INTERVAL 30 DAY)
            WHERE id = ?",
            [Identity::id()]
        );
        Activity::log(
            Identity::id(),
            'profile_updated',
            'Account scheduled for deletion.'
        );
        Session::destroy();
        Response::success(
            'Your account will be permanently deleted in 30 days.'
        );
    }
    public function cancel(): void
    {
        Request::patch();
        Query::execute(
            "UPDATE ielectro_account.accounts
            SET deletion_scheduled_at = NULL
            WHERE id = ?",
            [Identity::id()]
        );
        Activity::log(
            Identity::id(),
            'profile_updated',
            'Scheduled account deletion cancelled.'
        );
        Response::success(
            'Scheduled account deletion cancelled.'
        );
    }
}
