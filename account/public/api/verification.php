<?php
namespace Account;
use Nesh\Mail;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Identity;
class Verification
{
    public function send(): void
    {
        Request::post();
        EmailVerification::send(Identity::id());
        Response::success('Verification email sent');
    }
    public function confirm(): void
    {
        Request::post();
        $otp = trim((string) Request::value('otp'));
        if ($otp === '') {
            Response::badRequest('OTP is required');
        }
        if (!EmailVerification::verify(
            Identity::id(),
            $otp
        )) {
            Response::badRequest('Invalid or expired OTP');
        }
        Response::success('Email verified successfully');
    }
}
class EmailVerification
{
    private static function otp(): string
    {
        return str_pad(
            (string) random_int(0, 999999),
            6,
            '0',
            STR_PAD_LEFT
        );
    }
    public static function send(int $accountId): void
    {
        $account = Query::fetch(
            "SELECT
                email,
                name,
                email_verified_at
            FROM accounts
            WHERE id = ?
            LIMIT 1",
            [$accountId]
        );
        if (!$account) {
            Response::notFound('Account not found');
        }
        if ($account['email_verified_at'] !== null) {
            Response::badRequest('Email already verified');
        }
        Query::execute(
            "DELETE FROM account_email_verifications
            WHERE account_id = ?",
            [$accountId]
        );
        $otp = self::otp();
        Query::execute(
            "INSERT INTO account_email_verifications(
                account_id,
                target_email,
                otp_code,
                expires_at
            )
            VALUES(?, ?, ?, DATE_ADD(NOW(), INTERVAL 20 MINUTE))",
            [
                $accountId,
                $account['email'],
                $otp
            ]
        );
        Mail::html(
            $account['email'],
            'Verify your email address',
            '
            <h2>Email Verification</h2>
            <p>Hello <strong>' . htmlspecialchars($account['name']) . '</strong>,</p>
            <p>Your verification code is:</p>
            <h1 style="letter-spacing:6px">'
            . htmlspecialchars($otp) .
            '</h1>
            <p>This code expires in 20 minutes.</p>
            <p>If you did not request this verification, you can safely ignore this email.</p>
            '
        );
    }
    public static function verify(int $accountId, string $otp): bool 
    {
        $verification = Query::fetch(
            "SELECT account_id
            FROM account_email_verifications
            WHERE account_id = ?
            AND otp_code = ?
            AND expires_at > NOW()
            AND used_at IS NULL
            LIMIT 1",
            [
                $accountId,
                $otp
            ]
        );
        if (!$verification) {
            return false;
        }
        Query::execute(
            "UPDATE accounts
            SET email_verified_at = NOW()
            WHERE id = ?",
            [$accountId]
        );
        Query::execute(
            "UPDATE account_email_verifications
            SET used_at = NOW()
            WHERE account_id = ?",
            [$accountId]
        );
        return true;
    }
}