<?php
namespace Nesh;
class Security
{
    public static function ensure(): void
    {
        if (Cookie::has('csrf_token')) {
            return;
        }
        Cookie::set(
            'csrf_token',
            Generate::token(CSRF_TOKEN_LENGTH),
            time() + (86400 * 30),
            false
        );
    }
    public static function token(): string
    {
        self::ensure();
        return Cookie::get('csrf_token') ?? '';
    }
    public static function validate(string $token): bool
    {
        $cookie = Cookie::get('csrf_token');
        return $cookie !== null
            && $token !== ''
            && self::equals($cookie, $token);
    }
    public static function require(): void
    {
        Request::requireCsrf();
    }
    public static function equals(string $first, string $second): bool
    {
        return hash_equals($first, $second);
    }
    public static function random(int $length = 32): string
    {
        return Generate::token($length);
    }
    public static function encrypt(string $value, string $key): string
    {
        $cipher = 'aes-256-gcm';
        $iv = random_bytes(openssl_cipher_iv_length($cipher));
        $tag = '';
        $encrypted = openssl_encrypt(
            $value,
            $cipher,
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        if ($encrypted === false) {
            Response::error('Encryption failed');
        }
        return base64_encode($iv.$tag.$encrypted);
    }
    public static function decrypt(string $value, string $key): ?string
    {
        $cipher = 'aes-256-gcm';
        $data = base64_decode($value, true);
        if ($data === false) {
            return null;
        }
        $ivLength = openssl_cipher_iv_length($cipher);
        $iv = substr($data, 0, $ivLength);
        $tag = substr($data, $ivLength, 16);
        $encrypted = substr($data, $ivLength + 16);
        $decrypted = openssl_decrypt(
            $encrypted,
            $cipher,
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        return $decrypted === false
            ? null
            : $decrypted;
    }
}