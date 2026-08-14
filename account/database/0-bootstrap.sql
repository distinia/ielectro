CREATE TABLE IF NOT EXISTS `ielectro_account`.`accounts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `name` VARCHAR(50) DEFAULT NULL,
  `surname` VARCHAR(50) DEFAULT NULL,
  `birthday` DATE DEFAULT NULL,
  `gender` ENUM('male','female','other') DEFAULT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone_number` VARCHAR(32) DEFAULT NULL,
  `password_hash` VARCHAR(255) DEFAULT NULL,
  `email_verified_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_accounts_username` (`username`),
  UNIQUE KEY `uq_accounts_phone_number` (`phone_number`),
  UNIQUE KEY `uq_accounts_email` (`email`),
  KEY `idx_accounts_created` (`created_at`)
);
CREATE TABLE IF NOT EXISTS `ielectro_account`.`account_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_id` BIGINT UNSIGNED NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `country` CHAR(2) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `browser` VARCHAR(100) DEFAULT NULL,
  `os` VARCHAR(100) DEFAULT NULL,
  `device_info` TEXT DEFAULT NULL,
  `last_activity` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL,
  `revoked_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sessions_token` (`token_hash`),
  KEY `idx_sessions_account` (`account_id`),
  KEY `idx_sessions_expires` (`expires_at`),
  KEY `idx_sessions_revoked` (`revoked_at`),
  KEY `idx_sessions_last_activity` (`last_activity`),
  KEY `idx_sessions_token_revoked`
    (`token_hash`, `revoked_at`, `expires_at`),
  CONSTRAINT `account_fk_sessions_account`
    FOREIGN KEY (`account_id`)
    REFERENCES `ielectro_account`.`accounts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_account`.`account_activity` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_id` BIGINT UNSIGNED DEFAULT NULL,
  `action` ENUM(
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
  ) NOT NULL,
  `details` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `device_info` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_activity_account` (`account_id`),
  KEY `idx_activity_action` (`action`),
  KEY `idx_activity_created` (`created_at`),
  CONSTRAINT `account_activity_ibfk_1`
    FOREIGN KEY (`account_id`)
    REFERENCES `ielectro_account`.`accounts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_account`.`account_email_verifications` (
  `account_id` BIGINT UNSIGNED NOT NULL,
  `target_email` VARCHAR(255) NOT NULL,
  `otp_code` VARCHAR(12) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`),
  KEY `idx_email_verifications_expires` (`expires_at`),
  CONSTRAINT `account_email_verifications_ibfk_1`
    FOREIGN KEY (`account_id`)
    REFERENCES `ielectro_account`.`accounts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_account`.`account_password_resets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_id` BIGINT UNSIGNED NOT NULL,
  `token_hash` char(64) NOT NULL,
  `otp_code` varchar(12) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_password_resets_token` (`token_hash`),
  KEY `idx_password_resets_user` (`account_id`),
  KEY `idx_password_resets_expires` (`expires_at`),
  CONSTRAINT `account_password_resets_ibfk_1`
    FOREIGN KEY (`account_id`)
    REFERENCES `ielectro_account`.`accounts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_account`.`account_oauth_pending` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider` ENUM('google','apple','github','discord') NOT NULL,
  `provider_account_id` VARCHAR(255) NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `name` VARCHAR(100) DEFAULT NULL,
  `surname` VARCHAR(100) DEFAULT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_oauth_pending_token` (`token_hash`),
  UNIQUE KEY `uq_oauth_provider_user` (`provider`, `provider_account_id`),
  KEY `idx_oauth_pending_email` (`email`),
  KEY `idx_oauth_pending_provider` (`provider`),
  KEY `idx_oauth_pending_expires` (`expires_at`)
);