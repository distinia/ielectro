CREATE TABLE IF NOT EXISTS `careers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `location` VARCHAR(180) DEFAULT NULL,
  `employment_type` VARCHAR(64) NOT NULL DEFAULT 'full_time',
  `description` TEXT NOT NULL,
  `requirements` JSON DEFAULT NULL,
  `status` ENUM('active','hidden') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_careers_status` (`status`),
  KEY `idx_careers_created` (`created_at`)
);
CREATE TABLE IF NOT EXISTS `career_applications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) NOT NULL,
  `full_name` VARCHAR(160) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone_number` VARCHAR(32) DEFAULT NULL,
  `position` VARCHAR(180) NOT NULL,
  `cv_file` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('reviewing','accepted','rejected') NOT NULL DEFAULT 'reviewing',
  `reviewed_by` BIGINT UNSIGNED DEFAULT NULL,
  `reviewed_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_career_applications_uuid` (`uuid`),
  KEY `idx_career_applications_status` (`status`),
  KEY `idx_career_applications_reviewed_by` (`reviewed_by`),
  KEY `idx_career_applications_created` (`created_at`)
);
CREATE TABLE IF NOT EXISTS `news` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `author_id` BIGINT UNSIGNED DEFAULT NULL,
  `uuid` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `excerpt` TEXT DEFAULT NULL,
  `body` LONGTEXT NOT NULL,
  `image` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('draft','published','hidden') NOT NULL DEFAULT 'published',
  `published_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_news_uuid` (`uuid`),
  KEY `idx_news_author` (`author_id`),
  KEY `idx_news_status` (`status`),
  KEY `idx_news_published` (`published_at`),
  FULLTEXT KEY `ft_news_search` (`title`,`excerpt`,`body`)
);
CREATE TABLE IF NOT EXISTS `team` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) NOT NULL,
  `full_name` VARCHAR(160) NOT NULL,
  `role_text` VARCHAR(180) NOT NULL,
  `avatar` VARCHAR(255) DEFAULT NULL,
  `instagram` VARCHAR(255) DEFAULT NULL,
  `linkedin` VARCHAR(255) DEFAULT NULL,
  `github` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('active','hidden') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_team_uuid` (`uuid`),
  KEY `idx_team_status` (`status`)
);
CREATE TABLE IF NOT EXISTS `rate_limits` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `scope_key` varchar(128) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `attempts` INT UNSIGNED NOT NULL DEFAULT 0,
  `window_start` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rate_limit_scope_ip` (`scope_key`,`ip_address`),
  KEY `idx_rate_limits_expires` (`expires_at`)
);
