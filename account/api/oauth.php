<?php
namespace Account;
use Nesh\Response;
use Nesh\Request;
use Nesh\Routing;
use Nesh\Query;
use Nesh\Client;
use Nesh\Identity;
class Oauth {
    public function google(): void
    {
        Routing::method([
            'POST' => fn() => $this->authenticate(),
        ]);
    }
    private function authenticate(): void
    {
        Request::post();
        if (Identity::id() !== null) {
            Response::success('Already signed in');
        }
        $credential = trim((string) Request::value('credential'));
        if ($credential === '') {
            Response::badRequest('Google credential is required');
        }
        $payload = Google::verify($credential);
        if (!$payload) {
            Response::unauthorized('Invalid Google credential');
        }
        $profile = Google::profile($payload);
        if ($profile['email'] === '' || $profile['sub'] === '') {
            Response::badRequest('Invalid Google account');
        }
        $account = Query::fetch(
            "SELECT id FROM ielectro_account.accounts WHERE email = ? LIMIT 1",
            [$profile['email']]
        );
        if ($account) {
            Session::create((int) $account['id']);
            Activity::log(
                (int) $account['id'],
                'login',
                'Login from Google'
            );
            Response::success('Signed in successfully');
        }
        $accountId = Create::fromGoogle($profile);
        Session::create($accountId);
        Activity::log(
            $accountId,
            'register',
            'Account created with Google.'
        );
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
