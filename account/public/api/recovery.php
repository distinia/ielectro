<?php
namespace Account;
use Nesh\Generate;
use Nesh\Password;
use Nesh\Query;
use Nesh\Identity;
use Nesh\RateLimit;
use Nesh\Request;
use Nesh\Response;
use Nesh\Validate;
use Nesh\Mail;
class Recovery
{
    public function index(): void
    {
        Request::post();
        RateLimit::check('password_recovery', 6, 900);
        $GLOBALS['account']->database->use();
        $identifier = trim((string) Request::value('identifier'));
        if (!Validate::required($identifier)) {
            Response::badRequest('Username or email is required');
        }
        $GLOBALS['account']->database->use();
        $account = Query::fetch(
            "SELECT id, username, email, name, surname
            FROM accounts
            WHERE username = ? OR email = ?
            LIMIT 1",
            [
                $identifier,
                $identifier
            ]
        );
        if (!$account) {
            Response::notFound('Account not found');
        }
        Query::execute(
            "DELETE FROM password_resets
            WHERE account_id = ?",
            [$account['id']]
        );
        $token = Generate::token();
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        Query::execute(
            "INSERT INTO password_resets(
                account_id,
                token_hash,
                otp_code,
                expires_at
            )
            VALUES(?, ?, ?, DATE_ADD(NOW(), INTERVAL 20 MINUTE))",
            [
                $account['id'],
                Generate::hash($token),
                $otp
            ]
        );
        PasswordRecoveryEmail::send(
            $account['email'],
            $account['name'],
            $account['surname'],
            $otp,
            $token
        );
        Activity::log(
            $account['id'],
            'password_recovery_requested',
            Identity::username() . ' has requested a password recovery'
        );
        Response::success('Recovery email sent');
    }
    public function reset(): void
    {
        Request::post();
        RateLimit::check('password_reset', 8, 900);
        $token = trim((string) Request::value('token'));
        $otp = trim((string) Request::value('otp'));
        $password = (string) Request::value('password');
        $confirmPassword = (string) Request::value('confirm_password');
        if (
            !Validate::required($token) ||
            !Validate::required($otp) ||
            !Validate::required($password) ||
            !Validate::required($confirmPassword)
        ) {
            Response::badRequest('Missing required fields');
        }
        if (!Validate::same($password, $confirmPassword)) {
            Response::badRequest('Passwords do not match');
        }
        if (!Validate::min($password, 8)) {
            Response::badRequest('Password must be at least 8 characters');
        }
        $GLOBALS['account']->database->use();
        $reset = Query::fetch(
            "SELECT id, account_id
            FROM password_resets
            WHERE token_hash = ?
            AND otp_code = ?
            AND expires_at > NOW()
            AND used_at IS NULL
            LIMIT 1",
            [
                $token,
                $otp
            ]
        );
        if (!$reset) {
            Response::badRequest('Invalid recovery token or OTP');
        }
        Query::execute(
            "UPDATE accounts
            SET password_hash = ?
            WHERE id = ?",
            [
                Password::hash($password),
                $reset['account_id']
            ]
        );
        Query::execute(
            "UPDATE password_resets
            SET used_at = NOW()
            WHERE id = ?",
            [$reset['id']]
        );
        Query::execute(
            "DELETE FROM sessions
            WHERE account_id = ?",
            [$reset['account_id']]
        );
        Activity::log(
            $reset['account_id'],
            'password_change',
            'Password changed via password recovery'
        );
        Response::success('Password updated successfully');
    }
}
class PasswordRecoveryEmail
{
    public static function send(
        string $email,
        string $name,
        string $surname,
        string $otp,
        string $token
    ): bool {
        return Mail::html(
            $email,
            'Reset your iElectro password',
            '
            <html>
            <body style="font-family:Arial,sans-serif;color:#333;line-height:1.6">
                <h2>Password recovery</h2>
                <p>Hello <strong>' . htmlspecialchars($name . ' ' . $surname) . '</strong>,</p>
                <p>We received a request to reset your iElectro account password.</p>
                <p>
                    <strong>OTP</strong><br>
                    <span style="font-size:28px;font-weight:bold;letter-spacing:4px">'
                        . htmlspecialchars($otp) .
                    '</span>
                </p>
                <p>
                    <strong>Recovery token</strong><br>
                    <code>' . htmlspecialchars($token) . '</code>
                </p>
                <p>
                    This code expires in <strong>20 minutes</strong>.
                </p>
                <p>
                    If you did not request this password reset, you can safely ignore this email.
                </p>
            </body>
            </html>'
        );
    }
}