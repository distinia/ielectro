<?php
require_once __DIR__ . '/../nesh/src/autoload.php';
use Nesh\Identity;
use Nesh\Routing;
$app = $GLOBALS['dyscover'];
$app->api->publicApi = [];
Routing::bind($app);
if (
    Routing::segment(0) === 'article'
    && strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'GET'
    && Identity::id() === null
) {
    header(
        'Location: https://account.ielectro.com/login?service=dyscover',
        true,
        302
    );
    exit;
}
$app->run();
