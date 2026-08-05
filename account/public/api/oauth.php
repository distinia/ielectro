<?php
namespace Account;
use Nesh\Response;
use Nesh\Request;
use Nesh\Cookie;
use Nesh\Query;
use Nesh\Client;
class Oauth {
    public function google(): void
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
        $account = Query::fetch(
            "SELECT id FROM accounts WHERE email = ? LIMIT 1",
            [$payload['email']]
        );
        if (!$account) {
            Pending::create(
                $payload['email'],
                $payload['name'] ?? '',
                $payload['surname'] ?? ''
            );
            Response::success([
                'username' => $account['username'],
                'email' => $account['email']
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
        if (
            GOOGLE_CLIENT_ID !== ''
            && ($payload['aud'] ?? '') !== GOOGLE_CLIENT_ID
        ) {
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
}
class Pending
{
    private const COOKIE = 'google_signup_token';
    private const PROVIDER = 'google';
    public static function create(string $email, string $name, string $surname): void
    {
        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        Query::execute(
            "DELETE FROM account_oauth_pending WHERE provider = ? AND email = ?",
            [self::PROVIDER, $email]
        );
        Query::execute(
            "INSERT INTO account_oauth_pending(provider, provider_user_id, token_hash, email, name, surname, expires_at) VALUES (?, '', ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 20 MINUTE))",
            [self::PROVIDER, $tokenHash, $email, $name, $surname]
        );
        Cookie::set(self::COOKIE, $token, 1200);
    }
    public static function get(): ?array
    {
        $token = Cookie::get(self::COOKIE);
        if (!$token) {
            return null;
        }
        return Query::fetch(
            "SELECT email, name, surname FROM account_oauth_pending WHERE provider = ? AND token_hash = ? AND expires_at > NOW() LIMIT 1",
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
            "DELETE FROM account_oauth_pending WHERE provider = ? AND token_hash = ?",
            [self::PROVIDER, hash('sha256', $token)]
        );
        Cookie::delete(self::COOKIE);
    }
}