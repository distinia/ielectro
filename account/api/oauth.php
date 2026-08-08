<?php
namespace Account;
use Nesh\Response;
use Nesh\Request;
use Nesh\Routing;
use Nesh\Cookie;
use Nesh\Query;
use Nesh\Client;
class Oauth {
    public function google(): void
    {
        Routing::method([
            'GET' => fn() => $this->readPending(),
            'POST' => fn() => $this->authenticate(),
        ]);
    }
    private function readPending(): void
    {
        Request::get();
        $pending = Pending::get();
        if (!$pending) {
            Response::notFound('No pending Google sign-up');
        }
        Response::success($pending);
    }
    private function authenticate(): void
    {
        Request::post();
        $credential = trim((string) Request::value('credential'));
        if ($credential === '') {
            Response::badRequest('Google credential is required');
        }
        $payload = Google::verify($credential);
        if (!$payload) {
            Response::unauthorized('Invalid Google credential');
        }
        $profile = Google::profile($payload);
        $account = Query::fetch(
            "SELECT id FROM ielectro_account.accounts WHERE email = ? LIMIT 1",
            [$profile['email']]
        );
        if (!$account) {
            if ($profile['sub'] === '') {
                Response::badRequest('Invalid Google account');
            }

            Pending::create(
                $profile['email'],
                $profile['name'],
                $profile['surname'],
                $profile['sub']
            );
            Response::success([
                'email' => $profile['email'],
                'name' => $profile['name'],
                'surname' => $profile['surname'],
                'signup_required' => true,
            ]);
        }
        Pending::delete();
        Session::create((int) $account['id']);
        Response::success('Signed in successfully');
    }
}
class Google
{
    public static function verify(string $credential): ?array
    {
        $credential = trim($credential);
        if ($credential === '') {
            return null;
        }
        $response = Client::get(
            'https://oauth2.googleapis.com/tokeninfo?id_token=' .
            urlencode($credential)
        );
        if ($response === false) {
            return null;
        }
        $payload = json_decode($response, true);
        if (!is_array($payload) || isset($payload['error'])) {
            return null;
        }
        if (!in_array(
            $payload['iss'] ?? '',
            ['accounts.google.com', 'https://accounts.google.com'],
            true
        )) {
            return null;
        }
        if ((int) ($payload['exp'] ?? 0) <= time()) {
            return null;
        }
        if (
            ($payload['email_verified'] ?? false) !== true
            && ($payload['email_verified'] ?? '') !== 'true'
        ) {
            return null;
        }
        return $payload;
    }
    public static function profile(array $payload): array
    {
        $email = trim((string) ($payload['email'] ?? ''));
        $name = trim((string) ($payload['given_name'] ?? ''));
        $surname = trim((string) ($payload['family_name'] ?? ''));
        $fullName = trim((string) ($payload['full_name'] ?? $payload['name'] ?? ''));
        if ($name === '' && $fullName !== '') {
            $parts = preg_split('/\s+/', $fullName, 2);
            $name = trim((string) ($parts[0] ?? ''));
            if ($surname === '') {
                $surname = trim((string) ($parts[1] ?? ''));
            }
        } elseif ($surname === '' && $fullName !== '' && $name !== '') {
            $remainder = trim(str_replace($name, '', $fullName));
            $surname = $remainder;
        }
        return [
            'email' => $email,
            'name' => $name,
            'surname' => $surname,
            'sub' => trim((string) ($payload['sub'] ?? '')),
        ];
    }
}
class Pending
{
    private const COOKIE = 'google_signup_token';
    private const PROVIDER = 'google';
    private const TTL = 1200;
    public static function create(
        string $email,
        string $name,
        string $surname,
        string $providerAccountId
    ): void {
        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        Query::execute(
            "DELETE FROM ielectro_account.account_oauth_pending WHERE provider = ? AND email = ?",
            [self::PROVIDER, $email]
        );
        Query::execute(
            "INSERT INTO ielectro_account.account_oauth_pending(provider, provider_account_id, token_hash, email, name, surname, expires_at) VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 20 MINUTE))",
            [self::PROVIDER, $providerAccountId, $tokenHash, $email, $name, $surname]
        );
        Cookie::set(self::COOKIE, $token, time() + self::TTL);
    }
    public static function get(): ?array
    {
        $token = Cookie::get(self::COOKIE);
        if (!$token) {
            return null;
        }
        return Query::fetch(
            "SELECT email, name, surname FROM ielectro_account.account_oauth_pending WHERE provider = ? AND token_hash = ? AND expires_at > NOW() LIMIT 1",
            [self::PROVIDER, hash('sha256', $token)]
        );
    }
    public static function clear(): void
    {
        Cookie::delete(self::COOKIE);
    }
    public static function delete(): void
    {
        $token = Cookie::get(self::COOKIE);
        if (!$token) {
            return;
        }
        Query::execute(
            "DELETE FROM ielectro_account.account_oauth_pending WHERE provider = ? AND token_hash = ?",
            [self::PROVIDER, hash('sha256', $token)]
        );
        Cookie::delete(self::COOKIE);
    }
}
