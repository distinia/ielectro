<?php
namespace Account;
use Nesh\Identifier;
use Nesh\Password;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Strings;
use Nesh\Validate;
use Nesh\Session;
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
            'GET' => [$this->data, 'index'],
            'POST' => [$this->create, 'index'],
            'PATCH' => [$this->update, 'index'],
            'DELETE' => [$this->delete, 'index'],
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
        Routing::post();
        $account = $this->validate();
        $accountId = $this->insert($account);
        Services::create($accountId);
        AuthSession::create($accountId);
        Activity::log(
            $accountId,
            'register',
            'Account created.'
        );
        Response::created('Account created successfully');
    }
    private function validate(): array
    {
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
            $account['password'] = Identifier::token(16);
        }
        foreach ($account as $value) {
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
        if (!Validate::min($account['password'], 8)) {
            Response::badRequest('Password must be at least 8 characters');
        }
        if (
            Query::exists(
                "SELECT 1
                FROM accounts
                WHERE username = ?",
                [$account['username']]
            )
        ) {
            Response::conflict('Username already exists');
        }
        if (
            Query::exists(
                "SELECT 1
                FROM accounts
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
                "INSERT INTO accounts(
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
                    Password::hash($account['password'])
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
                FROM accounts
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
        Routing::get();
        $account = Query::fetch(
            "SELECT
                username,
                name,
                surname,
                birthday,
                gender,
                email,
                phone_number,
                created_at
            FROM accounts
            WHERE id = ?
            LIMIT 1",
            [Session::userId()]
        );
        if (!$account) {
            Response::notFound('Account not found');
        }
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
            'log' => 'Phone number changed'
        ],
        'email' => [
            'column' => 'email',
            'validator' => 'email',
            'unique' => true,
            'verify' => true,
            'log' => 'Email changed'
        ],
        'username' => [
            'column' => 'username',
            'validator' => 'username',
            'normalize' => true,
            'unique' => true,
            'activity' => 'username_change',
            'log' => 'Username changed'
        ]
    ];
    public function index(): void
    {
        Routing::patch();
        $input = Request::body();
        if (!$input) {
            Response::badRequest('No data provided');
        }
        $account = Query::fetch(
            "SELECT *
        FROM accounts
        WHERE id = ?",
            [Session::userId()]
        );
        $update = [];
        $params = [];
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
            $update[] = "{$config['column']} = ?";
            $params[] = $value;
            if (!empty($config['verify'])) {
                $update[] = "email_verified_at = NULL";
            }
            Activity::log(
                Session::userId(),
                $config['activity'] ?? 'profile_update',
                "{$config['log']}: {$account[$config['column']]} -> {$value}"
            );
        }
        if (!$update) {
            Response::success('Nothing changed');
        }
        $params[] = Session::userId();
        Query::execute(
            "UPDATE accounts
        SET " . implode(', ', $update) . "
        WHERE id = ?",
            $params
        );
        Response::success('Account updated');
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
            FROM accounts
            WHERE {$config['column']} = ?
            AND id <> ?",
                [
                    $value,
                    Session::userId()
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
        Routing::patch();
        Query::execute(
            "UPDATE accounts
            SET deletion_scheduled_at = DATE_ADD(NOW(), INTERVAL 30 DAY)
            WHERE id = ?",
            [Session::userId()]
        );
        Activity::log(
            Session::userId(),
            'profile_update',
            'Account scheduled for deletion.'
        );
        AuthSession::destroy();
        Response::success(
            'Your account will be permanently deleted in 30 days.'
        );
    }
    public function cancel(): void
    {
        Routing::patch();
        Query::execute(
            "UPDATE accounts
            SET deletion_scheduled_at = NULL
            WHERE id = ?",
            [Session::userId()]
        );
        Activity::log(
            Session::userId(),
            'profile_update',
            'Scheduled account deletion cancelled.'
        );
        Response::success(
            'Scheduled account deletion cancelled.'
        );
    }
}