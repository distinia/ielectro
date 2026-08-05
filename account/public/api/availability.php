<?php
namespace Account;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Validate;
class Availability
{
    public function index(): void
    {
        Request::post();
        $input = Request::body();
        $field = strtolower(trim((string) ($input['field'] ?? '')));
        $value = trim((string) ($input['value'] ?? ''));
        match ($field) {
            'username' => $this->username($value),
            'email'    => $this->email($value),
            'phone'    => $this->phone($value),
            default    => Response::badRequest('Invalid field'),
        };
    }
    private function username(string $username): void
    {
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
    private function email(string $email): void
    {
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
    private function phone(string $phone): void
    {
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