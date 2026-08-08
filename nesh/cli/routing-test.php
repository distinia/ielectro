<?php
require_once __DIR__ . '/../src/autoload.php';

function testRoute(
    string $appUrl,
    string $uri,
    array $expectedSegments,
    ?string $expectedRoute = null
): void {
    $_SERVER['REQUEST_URI'] = $uri;
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['HTTP_HOST'] = parse_url($appUrl, PHP_URL_HOST) ?? 'example.com';
    $_SERVER['HTTPS'] = str_starts_with($appUrl, 'https') ? 'on' : 'off';
    $_GET = [];

    if (str_contains($uri, '?')) {
        parse_str((string) parse_url($uri, PHP_URL_QUERY), $_GET);
    }

    $app = new Nesh\App('Test', $appUrl, 'test', null, '1.0.0');
    Nesh\Routing::bind($app);

    $fail = [];
    foreach ($expectedSegments as $index => $value) {
        $actual = Nesh\Routing::segment($index);
        if ((string) $actual !== (string) $value) {
            $fail[] = "seg{$index}=" . var_export($actual, true) . " expected {$value}";
        }
    }

    $expectedPath = $expectedSegments === []
        ? 'home'
        : implode('/', $expectedSegments);

    if (Nesh\Routing::path() !== $expectedPath) {
        $fail[] = 'path=' . Nesh\Routing::path() . " expected {$expectedPath}";
    }

    if ($expectedRoute !== null && Nesh\Routing::route() !== $expectedRoute) {
        $fail[] = 'route=' . Nesh\Routing::route() . " expected {$expectedRoute}";
    }

    if ($fail) {
        echo "FAIL {$appUrl} {$uri}: " . implode('; ', $fail) . PHP_EOL;
        return;
    }

    echo "OK {$appUrl} {$uri}" . PHP_EOL;
}

function testRouteFail(
    string $appUrl,
    string $uri,
    int $segmentIndex,
    string $mustNotEqual
): void {
    $_SERVER['REQUEST_URI'] = $uri;
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['HTTP_HOST'] = parse_url($appUrl, PHP_URL_HOST) ?? 'example.com';
    $_SERVER['HTTPS'] = 'on';

    $app = new Nesh\App('Test', $appUrl, 'test', null, '1.0.0');
    Nesh\Routing::bind($app);

    $actual = (string) Nesh\Routing::segment($segmentIndex);
    if ($actual === $mustNotEqual) {
        echo "FAIL {$uri}: segment({$segmentIndex}) incorrectly matched {$mustNotEqual}" . PHP_EOL;
        return;
    }

    echo "OK {$uri} does not strip /{$mustNotEqual} prefix from unrelated path" . PHP_EOL;
}

echo "API routes\n";
testRoute('https://account.ielectro.com', '/api/users', ['api', 'users'], '/api/users');
testRoute('https://www.example.com/account', '/account/api/users', ['api', 'users'], '/api/users');
testRoute('https://account.ielectro.com', '/ielectro/account/api/users', ['api', 'users'], '/api/users');
testRoute('https://account.ielectro.com', '/api/users/', ['api', 'users'], '/api/users');
testRoute('https://account.ielectro.com', '/api/users?page=2', ['api', 'users'], '/api/users');

echo "Page routes\n";
testRoute('https://account.ielectro.com', '/activity', ['activity'], '/activity');
testRoute('https://www.example.com/account', '/account/activity', ['activity'], '/activity');
testRoute('https://account.ielectro.com', '/ielectro/account/activity', ['activity'], '/activity');
testRoute('https://account.ielectro.com', '/activity/', ['activity'], '/activity');

echo "Application root\n";
testRoute('https://account.ielectro.com', '/', [], '/');
testRoute('https://www.example.com/account', '/account/', [], '/');
testRoute('https://account.ielectro.com', '/ielectro/account/', [], '/');

echo "Security\n";
testRouteFail(
    'https://www.example.com/account',
    '/accounting',
    0,
    'activity'
);

$queryTest = function (): void {
    $_SERVER['REQUEST_URI'] = '/api/users?page=2';
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['HTTP_HOST'] = 'account.ielectro.com';
    $_SERVER['HTTPS'] = 'on';
    $_GET = [];
    parse_str('page=2', $_GET);

    $app = new Nesh\App('Test', 'https://account.ielectro.com', 'test', null, '1.0.0');
    Nesh\Routing::bind($app);

    $ok = Nesh\Routing::segment(0) === 'api'
        && Nesh\Routing::segment(1) === 'users'
        && ($_GET['page'] ?? null) === '2';

    echo ($ok ? 'OK' : 'FAIL') . ' query string preserved separately from route' . PHP_EOL;
};
$queryTest();

$local = new Nesh\App('Account', 'https://account.ielectro.com', 'account', null, '1.0.0');
echo ($local->basePath === '/ielectro/account/' ? 'OK' : 'FAIL') . ' localhost basePath' . PHP_EOL;
