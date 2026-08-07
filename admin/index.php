<?php
require_once __DIR__ . '/../nesh/src/autoload.php';
$GLOBALS['admin']->api->publicApi = [
    'news',
    'careers',
    'careers/apply',
    'team',
    'apps',
];
$GLOBALS['admin']->run();
