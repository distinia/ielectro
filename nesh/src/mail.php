<?php
namespace Nesh;
class Mail
{
    public static function send(
        string $to,
        string $subject,
        string $message,
        bool $html = true,
        array $headers = []
    ): bool {
        if (!self::verify($to)) {
            return false;
        }
        $headers = array_merge(
            [
                'MIME-Version: 1.0',
                'Content-Type: '.($html ? 'text/html' : 'text/plain').'; charset='.CHARSET,
                'From: '.MAIL_NAME.' <'.MAIL_ADDRESS.'>'
            ],
            $headers
        );
        return self::deliver(
            trim($to),
            trim($subject),
            $message,
            $headers
        );
    }
    public static function html(string $to, string $subject, string $html, array $headers = []): bool
    {
        return self::send($to, $subject, $html, true, $headers);
    }
    public static function text(string $to, string $subject, string $text, array $headers = []): bool
    {
        return self::send($to, $subject, $text, false, $headers);
    }
    public static function verify(string $email): bool
    {
        return filter_var(trim($email), FILTER_VALIDATE_EMAIL) !== false;
    }
    private static function deliver(string $to, string $subject, string $message, array $headers): bool
    {
        return mail(
            $to,
            $subject,
            $message,
            implode("\r\n", $headers)
        );
    }
}