<?php
namespace Account;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Validate;
class Availability
{
    public function username(): void
    {
        Request::get();
        $username = trim((string) Request::segment(3));
        if (!Validate::username($username)) {
            Response::badRequest('Invalid username');
        }
        Response::success([
            'available' => !Query::exists(
                "SELECT 1 FROM accounts WHERE username = ? LIMIT 1",
                [$username]
            )
        ]);
    }
    public function email(): void
    {
        Request::get();
        $email = trim((string) Request::segment(3));
        if (!Validate::email($email)) {
            Response::badRequest('Invalid email');
        }
        Response::success([
            'available' => !Query::exists(
                "SELECT 1 FROM accounts WHERE email = ? LIMIT 1",
                [$email]
            )
        ]);
    }
    public function phone(): void
    {
        Request::get();
        $phone = trim((string) Request::segment(3));
        if (!Validate::phone($phone)) {
            Response::badRequest('Invalid phone number');
        }
        Response::success([
            'available' => !Query::exists(
                "SELECT 1 FROM accounts WHERE phone = ? LIMIT 1",
                [$phone]
            )
        ]);
    }
}