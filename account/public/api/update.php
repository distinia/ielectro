<?php
namespace Account;
use Nesh\Password;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Strings;
use Nesh\Validate;
use Nesh\Session;
class Update
{
    public function index(): void
    {
        Request::put();

        match (Request::segment(2)) {
            'name' => $this->name(),
            'birthday' => $this->birthday(),
            'gender' => $this->gender(),
            'email' => $this->email(),
            'phone' => $this->phone(),
            'password' => $this->password(),
            'username' => $this->username(),
            default => Response::notFound(),
        };
    }
    public function name(): void
    {
        $account = Query::fetch(
            "SELECT name, surname
        FROM accounts
        WHERE id = ?",
            [Session::userId()]
        );
        if (!$account) {
            Response::notFound('Account not found');
        }
        $name = trim((string) Request::value('name'));
        $surname = trim((string) Request::value('surname'));
        if (!Validate::required($name)) {
            Response::badRequest('First name is required');
        }
        if (!Validate::required($surname)) {
            Response::badRequest('Surname is required');
        }
        Query::execute(
            "UPDATE accounts
        SET
            name = ?,
            surname = ?
        WHERE id = ?",
            [
                $name,
                $surname,
                Session::userId()
            ]
        );
        Activity::log(
            Session::userId(),
            'profile_update',
            'Name changed: '
            . $account['name'] . ' ' . $account['surname']
            . ' -> '
            . $name . ' ' . $surname
        );
        Response::success('Name updated');
    }

    public function birthday(): void
    {
        $account = Query::fetch(
            "SELECT birthday
        FROM accounts
        WHERE id = ?",
            [Session::userId()]
        );
        if (!$account) {
            Response::notFound('Account not found');
        }
        $birthday = trim((string) Request::value('birthday'));
        if (!Validate::required($birthday)) {
            Response::badRequest('Birthday is required');
        }
        if (!Validate::date($birthday)) {
            Response::badRequest('Invalid birthday');
        }
        Query::execute(
            "UPDATE accounts
        SET birthday = ?
        WHERE id = ?",
            [
                $birthday,
                Session::userId()
            ]
        );
        Activity::log(
            Session::userId(),
            'profile_update',
            'Birthday changed: '
            . $account['birthday']
            . ' -> '
            . $birthday
        );
        Response::success('Birthday updated');
    }

    public function gender(): void
    {
        $account = Query::fetch(
            "SELECT gender
        FROM accounts
        WHERE id = ?",
            [Session::userId()]
        );
        if (!$account) {
            Response::notFound('Account not found');
        }
        $gender = trim((string) Request::value('gender'));
        if (!Validate::required($gender)) {
            Response::badRequest('Gender is required');
        }
        if (!Validate::in($gender, ['Male', 'Female', 'Other'])) {
            Response::badRequest('Invalid gender');
        }
        Query::execute(
            "UPDATE accounts
        SET gender = ?
        WHERE id = ?",
            [
                $gender,
                Session::userId()
            ]
        );
        Activity::log(
            Session::userId(),
            'profile_update',
            'Gender changed: '
            . $account['gender']
            . ' -> '
            . $gender
        );
        Response::success('Gender updated');
    }

    public function phone(): void
    {
        $account = Query::fetch(
            "SELECT phone_number
        FROM accounts
        WHERE id = ?",
            [Session::userId()]
        );
        if (!$account) {
            Response::notFound('Account not found');
        }
        $phone = trim((string) Request::value('phone_number'));
        if (!Validate::required($phone)) {
            Response::badRequest('Phone number is required');
        }
        if (!Validate::phone($phone)) {
            Response::badRequest('Invalid phone number');
        }
        if (
            Query::exists(
                "SELECT 1
            FROM accounts
            WHERE phone_number = ?
            AND id <> ?",
                [
                    $phone,
                    Session::userId()
                ]
            )
        ) {
            Response::conflict('Phone number already exists');
        }
        Query::execute(
            "UPDATE accounts
        SET phone_number = ?
        WHERE id = ?",
            [
                $phone,
                Session::userId()
            ]
        );
        Activity::log(
            Session::userId(),
            'phone_number_change',
            'Phone number changed: '
            . ($account['phone_number'] ?: 'none')
            . ' -> '
            . $phone
        );
        Response::success('Phone number updated');
    }
    public function email(): void
    {
        $account = Query::fetch(
            "SELECT email
        FROM accounts
        WHERE id = ?",
            [Session::userId()]
        );
        if (!$account) {
            Response::notFound('Account not found');
        }
        $email = trim((string) Request::value('email'));
        if (!Validate::required($email)) {
            Response::badRequest('Email is required');
        }
        if (!Validate::email($email)) {
            Response::badRequest('Invalid email');
        }
        if (
            Query::exists(
                "SELECT 1
            FROM accounts
            WHERE email = ?
            AND id <> ?",
                [
                    $email,
                    Session::userId()
                ]
            )
        ) {
            Response::conflict('Email already exists');
        }
        Query::execute(
            "UPDATE accounts
        SET
            email = ?,
            email_verified_at = NULL
        WHERE id = ?",
            [
                $email,
                Session::userId()
            ]
        );
        Activity::log(
            Session::userId(),
            'email_change',
            'Email changed: '
            . $account['email']
            . ' -> '
            . $email
        );
        Response::success('Email updated');
    }

    public function username(): void
    {
        $account = Query::fetch(
            "SELECT username
        FROM accounts
        WHERE id = ?",
            [Session::userId()]
        );
        if (!$account) {
            Response::notFound('Account not found');
        }
        $username = Strings::normalize(
            Request::value('username')
        );
        if (!Validate::username($username)) {
            Response::badRequest('Invalid username');
        }
        if ($username === $account['username']) {
            Response::badRequest('This is already your username');
        }
        if (
            Query::exists(
                "SELECT 1
            FROM accounts
            WHERE username = ?
            AND id <> ?",
                [
                    $username,
                    Session::userId()
                ]
            )
        ) {
            Response::conflict('Username already exists');
        }
        Query::execute(
            "UPDATE accounts
            SET username = ?
            WHERE id = ?",
            [
                $username,
                Session::userId()
            ]
        );
        Activity::log(
            Session::userId(),
            'username_change',
            'Username changed: '
            . $account['username']
            . ' -> '
            . $username
        );
        Response::success('Username updated');
    }

    public function password(): void
    {
        $account = Query::fetch(
            "SELECT password_hash
        FROM accounts
        WHERE id = ?",
            [Session::userId()]
        );
        if (!$account) {
            Response::notFound('Account not found');
        }
        $currentPassword = (string) Request::value('current_password');
        $password = (string) Request::value('password');
        $confirmPassword = (string) Request::value('confirm_password');
        if (!Validate::required($currentPassword)) {
            Response::badRequest('Current password is required');
        }
        if (!Password::verify($currentPassword, $account['password_hash'])) {
            Response::forbidden('Current password is incorrect');
        }
        if (!Validate::required($password)) {
            Response::badRequest('Password is required');
        }
        if (!Validate::min($password, 8)) {
            Response::badRequest('Password must be at least 8 characters');
        }
        if (!Validate::same($password, $confirmPassword)) {
            Response::badRequest('Passwords do not match');
        }
        Query::execute(
            "UPDATE accounts
        SET password_hash = ?
        WHERE id = ?",
            [
                Password::hash($password),
                Session::userId()
            ]
        );
        Activity::log(
            Session::userId(),
            'password_change',
            'Password changed.'
        );
        Response::success('Password updated');
    }
}