<?php
require_once __DIR__ . '/../nesh/src/autoload.php';
$GLOBALS['account']->api->publicApi = [
    'oauth/google',
    'recovery',
    'availability',
    'recovery/reset',
];
$GLOBALS['account']->run();
