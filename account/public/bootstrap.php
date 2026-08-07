<?php
require_once __DIR__ . '/../../nesh/src/autoload.php';
use Nesh\App;
$iElectroAccount = new App(
    'iElectro Account',
    'account',
    'account',
    'ielectro_account',
    '1.0.0'
);
$iElectroAccount->api->publicApi = [
    'user',
    'auth/login',
    'oauth/google',
    'recovery',
    'availability',
    'recovery/reset',
];