<?php
require_once __DIR__ . '/../nesh/src/autoload.php';
$GLOBALS['ielectro']->api->publicApi = [
    'views/track',
    'stats',
];
$GLOBALS['ielectro']->run();