<?php
require_once __DIR__ . '/../bootstrap.php';
use Nesh\Api;
use Nesh\Request;
$route = Request::route();
if (in_array($route, [
    'api/auth/login',
    'api/create',
    'api/oauth/google',
    'api/password-recovery/request',
    'api/password-recovery/reset',
], true)) {
    new Api(false);
} else {
    new Api();
}
