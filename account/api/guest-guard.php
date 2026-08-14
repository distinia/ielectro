<?php
namespace Account;
use Nesh\Identity;
class GuestGuard
{
    private const GUEST_PAGES = [
        'login',
        'create',
        'oauth-create',
        'password-recovery',
    ];
    public static function maybeRedirect(): void
    {
        if (Identity::id() === null) {
            return;
        }
        $page = self::currentPage();
        if (!in_array($page, self::GUEST_PAGES, true)) {
            return;
        }
        header('Location: ' . self::redirectUrl(), true, 302);
        exit;
    }
    private static function currentPage(): string
    {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $path = rtrim($path, '/') ?: '/';
        if ($path === '/' || str_ends_with($path, '/home')) {
            return 'home';
        }
        $parts = array_values(array_filter(explode('/', trim($path, '/'))));
        return $parts ? (string) end($parts) : 'home';
    }
    private static function redirectUrl(): string
    {
        $previous = trim((string) ($_COOKIE['previous_url'] ?? ''));
        if ($previous !== '') {
            return rawurldecode($previous);
        }
        $service = (string) ($_GET['service'] ?? '');
        if ($service === 'dyscover') {
            return 'https://dyscover.ielectro.com/';
        }
        return 'https://account.ielectro.com/home';
    }
}
