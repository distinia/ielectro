<?php
require_once __DIR__ . '/../../nesh/src/autoload.php';
$iElectroAccount = $GLOBALS['account'];
$iElectroAccount->api->publicApi = [
    'user',
    'auth/login',
    'oauth/google',
    'recovery',
    'availability',
    'recovery/reset',
];
$iElectroAccount->run();
