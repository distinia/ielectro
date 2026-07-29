<?php
namespace Nesh;
class Password
{
    public static function hash(string $password): string
    {
        return password_hash($password, PASSWORD_DEFAULT);
    }
    public static function verify(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }
    public static function needsRehash(string $hash): bool
    {
        return password_needs_rehash($hash, PASSWORD_DEFAULT);
    }
    public static function validate(
        string $password,
        int $minLength = 8,
        bool $lowercase = true,
        bool $uppercase = true,
        bool $numbers = true,
        bool $symbols = true
    ): bool {
        if (strlen($password) < $minLength) {
            return false;
        }
        if ($lowercase && !preg_match('/[a-z]/', $password)) {
            return false;
        }
        if ($uppercase && !preg_match('/[A-Z]/', $password)) {
            return false;
        }
        if ($numbers && !preg_match('/\d/', $password)) {
            return false;
        }
        if ($symbols && !preg_match('/[^a-zA-Z0-9]/', $password)) {
            return false;
        }
        return true;
    }
    public static function score(string $password): int
    {
        $score = 0;
        $length = strlen($password);
        $score += min($length * 4, 40);
        if (preg_match('/[a-z]/', $password)) {
            $score += 15;
        }
        if (preg_match('/[A-Z]/', $password)) {
            $score += 15;
        }
        if (preg_match('/\d/', $password)) {
            $score += 15;
        }
        if (preg_match('/[^a-zA-Z0-9]/', $password)) {
            $score += 15;
        }
        return min($score, 100);
    }
    public static function generate(
        int $length = 16,
        bool $lowercase = true,
        bool $uppercase = true,
        bool $numbers = true,
        bool $symbols = true
    ): string {
        $characters = '';
        if ($lowercase) {
            $characters .= 'abcdefghijklmnopqrstuvwxyz';
        }
        if ($uppercase) {
            $characters .= 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        }
        if ($numbers) {
            $characters .= '0123456789';
        }
        if ($symbols) {
            $characters .= '!@#$%^&*()-_=+[]{}<>?';
        }
        if ($characters === '') {
            Response::badRequest('At least one character set must be enabled');
        }
        $password = '';
        $max = strlen($characters) - 1;
        for ($i = 0; $i < $length; $i++) {
            $password .= $characters[random_int(0, $max)];
        }
        return $password;
    }
}