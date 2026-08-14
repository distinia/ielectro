<?php
require_once __DIR__ . '/../nesh/src/autoload.php';
require_once __DIR__ . '/pages-guard.php';
$admin = $GLOBALS['admin'];
$admin->api->publicApi = [
    'news',
    'careers',
    'careers/apply',
    'team',
    'apps',
];
$admin->pages = new Admin\AdminPages($admin);
$admin->run();
