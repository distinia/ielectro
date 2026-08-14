ALTER TABLE `ielectro_account`.`account_activity`
  MODIFY COLUMN `action` ENUM(
    'register',
    'login',
    'login_failed',
    'logout',
    'email_verified',
    'email_changed',
    'password_changed',
    'password_reset',
    'username_changed',
    'profile_updated',
    'phone_number_changed',
    'session_revoked',
    'deleted'
  ) NOT NULL;
