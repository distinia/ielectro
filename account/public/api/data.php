<?php
namespace Account;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Session;
class Data
{
    public function __construct()
    {
        Request::get();
        $this->index();
    }
    public function index(): void
    {
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