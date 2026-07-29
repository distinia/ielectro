<?php
namespace Account;
use Nesh\Password;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Strings;
use Nesh\Validate;
class Create
{
    public function index(): void
    {
        Request::post();
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
}