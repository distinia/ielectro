<?php
namespace Admin;

use Nesh\Identity;
use Nesh\Request;
use Nesh\Response;

require_once __DIR__ . '/access.php';

class Me
{
    public function index(): void
    {
        Request::get();
        Identity::required();
        $member = Access::member();
        Response::success([
            'account_id' => Identity::id(),
            'username' => Identity::username(),
            'allowed' => $member !== null,
            'member' => $member,
        ]);
    }
}
