<?php
require_once __DIR__ . '/../src/autoload.php';

function testRoute(string $uri, string $script, array $expected): void
{
    $_SERVER['REQUEST_URI'] = $uri;
    $_SERVER['SCRIPT_NAME'] = $script;
    $_SERVER['HTTP_HOST'] = 'www.example.com';
    $_SERVER['HTTPS'] = 'on';

    $app = new Nesh\App('Test', 'test', 'test', null, '1.0.0');
    Nesh\Routing::bind($app);

    $fail = [];
    foreach ($expected as $index => $value) {
        $actual = (string) Nesh\Routing::segment($index);
        if ($actual !== (string) $value) {
            $fail[] = "seg{$index}={$actual} expected {$value}";
        }
    }

    $path = Nesh\Routing::path();
    $expectedPath = $expected === ['home']
        ? 'home'
        : implode('/', $expected);

    if ($path !== $expectedPath) {
        $fail[] = "path={$path} expected {$expectedPath}";
    }

    echo ($fail ? "FAIL {$uri}: " . implode('; ', $fail) : "OK {$uri}") . PHP_EOL;
}

testRoute('/api/posts?page=2', '/index.php', ['api', 'posts']);
testRoute('/dyscover/api/posts?page=2', '/dyscover/index.php', ['api', 'posts']);
testRoute('/dyscover/', '/dyscover/index.php', ['home']);
testRoute('/', '/index.php', ['home']);
testRoute(
    '/dyscover/api/inbox/5/messages/12',
    '/dyscover/index.php',
    ['api', 'inbox', '5', 'messages', '12']
);
testRoute(
    '/dyscover/../etc/passwd/api/posts',
    '/dyscover/index.php',
    ['etc', 'passwd', 'api', 'posts']
);
