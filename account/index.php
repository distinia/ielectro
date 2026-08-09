<?php
require_once __DIR__ . '/../nesh/src/autoload.php';
$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$requestSegments = array_values(array_filter(explode('/', trim($requestPath, '/'))));
if (($requestSegments[0] ?? '') !== 'api') {
    Account\GuestGuard::maybeRedirect();
}
$GLOBALS['account']->api->publicApi = [
    'oauth/google',
    'recovery',
    'availability',
    'recovery/reset',
];
$GLOBALS['account']->run();
