-- iElectro unified database schema
-- Generated: 2026-08-22 16:35:01
-- Order: account -> admin -> dyscover -> dominions

-- ============================================================
-- Application: iElectro Account
-- Folder: account
-- Database: ielectro_account
-- ============================================================

-- Source: account/database/0-bootstrap.sql
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

-- ============================================================
-- Application: iElectro Admin
-- Folder: admin
-- Database: ielectro_admin
-- ============================================================

-- Source: admin/database/0-bootstrap.sql
CREATE TABLE IF NOT EXISTS `ielectro_admin`.`careers` (
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
CREATE TABLE IF NOT EXISTS `ielectro_admin`.`career_applications` (
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
CREATE TABLE IF NOT EXISTS `ielectro_admin`.`news` (
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
CREATE TABLE IF NOT EXISTS `ielectro_admin`.`team` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) NOT NULL,
  `account_id` BIGINT UNSIGNED DEFAULT NULL,
  `role_text` VARCHAR(180) NOT NULL,
  `linkedin` VARCHAR(255) DEFAULT NULL,
  `github` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('active','hidden') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_team_uuid` (`uuid`),
  KEY `idx_team_account` (`account_id`),
  KEY `idx_team_status` (`status`)
);
CREATE TABLE IF NOT EXISTS `ielectro_admin`.`rate_limits` (
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

-- Source: admin/database/1-www-page-views.sql
CREATE TABLE IF NOT EXISTS `ielectro_admin`.`www_page_views` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `path` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_www_page_views_path` (`path`),
  KEY `idx_www_page_views_created` (`created_at`)
);

-- ============================================================
-- Application: Dyscover
-- Folder: dyscover
-- Database: ielectro_dyscover
-- ============================================================

-- Source: dyscover/database/0-bootstrap.sql
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_id` BIGINT UNSIGNED NOT NULL,
  `biography` text DEFAULT NULL,
  `role` ENUM('user','moderator') NOT NULL DEFAULT 'user',
  `status` ENUM('active','suspended','banned') NOT NULL DEFAULT 'active',
  `suspended_until` DATETIME DEFAULT NULL,
  `ban_reason` TEXT DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_account` (`account_id`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_tags` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tag_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_follows` (
  `follower_id` BIGINT UNSIGNED NOT NULL,
  `followed_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`follower_id`, `followed_id`),
  KEY `idx_follows_followed` (`followed_id`),
  CONSTRAINT `dyscover_follows_ibfk_1`
    FOREIGN KEY (`follower_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_follows_ibfk_2`
    FOREIGN KEY (`followed_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Source: dyscover/database/1-groups.sql
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_groups` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `visibility` ENUM('private','public') DEFAULT 'private',
  `creator_id` BIGINT UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_groups_creator` (`creator_id`),
  KEY `idx_groups_visibility` (`visibility`),
  CONSTRAINT `dyscover_groups_ibfk_1`
    FOREIGN KEY (`creator_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_group_members` (
  `group_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role` ENUM('owner','admin','moderator','member') DEFAULT 'member',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`group_id`, `user_id`),
  KEY `idx_group_members_user` (`user_id`),
  CONSTRAINT `dyscover_group_members_ibfk_1`
    FOREIGN KEY (`group_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_groups` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_group_members_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Source: dyscover/database/2-posts.sql
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_posts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `uuid` CHAR(36) NOT NULL,
  `type` ENUM('article','image','video','audio','document','template') NOT NULL,
  `title` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `extension` VARCHAR(10) DEFAULT NULL,
  `preview_image` VARCHAR(255) DEFAULT NULL,
  `visibility` ENUM('public','private','unlisted') DEFAULT 'public',
  `allow_comments` BOOLEAN DEFAULT TRUE,
  `allow_shares` BOOLEAN DEFAULT TRUE,
  `status` ENUM('active','hidden','removed') DEFAULT 'active',
  `published_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_posts_uuid` (`uuid`),
  KEY `idx_posts_uuid` (`uuid`),
  KEY `idx_posts_user` (`user_id`),
  KEY `idx_posts_type` (`type`),
  KEY `idx_posts_visibility` (`visibility`),
  KEY `idx_posts_status` (`status`),
  KEY `idx_posts_published` (`published_at`),
  KEY `idx_posts_updated` (`updated_at`),
  CONSTRAINT `dyscover_posts_ibfk_1`
    FOREIGN KEY (`user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_post_likes` (
  `post_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`, `user_id`),
  KEY `idx_post_likes_user` (`user_id`),
  CONSTRAINT `dyscover_post_likes_ibfk_1`
    FOREIGN KEY (`post_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_posts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_post_likes_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_post_comments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `parent_id` BIGINT UNSIGNED DEFAULT NULL,
  `body` TEXT NOT NULL,
  `status` ENUM('active','hidden') DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_post_comments_post` (`post_id`),
  KEY `idx_post_comments_user` (`user_id`),
  KEY `idx_post_comments_parent` (`parent_id`),
  KEY `idx_post_comments_status` (`status`),
  KEY `idx_post_comments_created` (`created_at`),
  CONSTRAINT `dyscover_post_comments_ibfk_1`
    FOREIGN KEY (`post_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_posts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_post_comments_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_post_comments_ibfk_3`
    FOREIGN KEY (`parent_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_post_comments` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_post_comment_likes` (
  `comment_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`comment_id`, `user_id`),
  KEY `idx_post_comment_likes_user` (`user_id`),
  CONSTRAINT `dyscover_post_comment_likes_ibfk_1`
    FOREIGN KEY (`comment_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_post_comments` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_post_comment_likes_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_post_shares` (
  `post_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`, `user_id`),
  KEY `idx_post_shares_user` (`user_id`),
  CONSTRAINT `dyscover_post_shares_ibfk_1`
    FOREIGN KEY (`post_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_posts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_post_shares_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_post_bookmarks` (
  `post_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`, `user_id`),
  KEY `idx_post_bookmarks_user` (`user_id`),
  CONSTRAINT `dyscover_post_bookmarks_ibfk_1`
    FOREIGN KEY (`post_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_posts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_post_bookmarks_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_post_views` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_post_views_post` (`post_id`),
  KEY `idx_post_views_user` (`user_id`),
  KEY `idx_post_views_created` (`created_at`),
  CONSTRAINT `dyscover_post_views_ibfk_1`
    FOREIGN KEY (`post_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_posts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_post_views_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_post_mentions` (
  `post_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`, `user_id`),
  KEY `idx_post_mentions_user` (`user_id`),
  CONSTRAINT `dyscover_post_mentions_ibfk_1`
    FOREIGN KEY (`post_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_posts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_post_mentions_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_post_tags` (
  `post_id` BIGINT UNSIGNED NOT NULL,
  `tag_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`post_id`, `tag_id`),
  KEY `idx_post_tags_tag` (`tag_id`),
  CONSTRAINT `dyscover_post_tags_ibfk_1`
    FOREIGN KEY (`post_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_posts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_post_tags_ibfk_2`
    FOREIGN KEY (`tag_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_tags` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_post_reposts` (
  `post_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`, `user_id`),
  KEY `idx_post_reposts_user` (`user_id`),
  CONSTRAINT `dyscover_post_reposts_ibfk_1`
    FOREIGN KEY (`post_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_posts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_post_reposts_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_post_statistics` (
  `post_id` BIGINT UNSIGNED NOT NULL,
  `views` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `likes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `comments` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `mentions` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `shares` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `bookmarks` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`),
  CONSTRAINT `dyscover_post_statistics_ibfk_1`
    FOREIGN KEY (`post_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_posts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_template_fields` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('single-image', 'large-image', 'double-image', 'definition', 'text', 'double-column', 'double-column-extended') NOT NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_template_fields_template` (`template_id`),
  CONSTRAINT `dyscover_template_fields_ibfk_1`
    FOREIGN KEY (`template_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_posts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Source: dyscover/database/3-inbox.sql
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_inbox_chats` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `type` ENUM('direct','group') NOT NULL DEFAULT 'direct',
  `group_id` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chats_group` (`group_id`),
  KEY `idx_chats_updated` (`updated_at`),
  CONSTRAINT `dyscover_inbox_chats_ibfk_1`
    FOREIGN KEY (`group_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_groups` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_inbox_members` (
  `chat_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `joined_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`chat_id`, `user_id`),
  KEY `idx_inbox_members_user` (`user_id`),
  CONSTRAINT `dyscover_inbox_members_ibfk_1`
    FOREIGN KEY (`chat_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_inbox_chats` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_inbox_members_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_inbox_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `chat_id` BIGINT UNSIGNED NOT NULL,
  `sender_id` BIGINT UNSIGNED NOT NULL,
  `reply_to_id` BIGINT UNSIGNED DEFAULT NULL,
  `type` ENUM('text','image','video','audio','file','post') DEFAULT 'text',
  `body` TEXT DEFAULT NULL,
  `attachment` TEXT DEFAULT NULL,
  `redacted` TINYINT(1) NOT NULL DEFAULT 0,
  `post_id` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_messages_chat` (`chat_id`),
  KEY `idx_messages_sender` (`sender_id`),
  KEY `idx_messages_post` (`post_id`),
  KEY `idx_messages_reply` (`reply_to_id`),
  KEY `idx_messages_created` (`created_at`),
  CONSTRAINT `dyscover_inbox_messages_ibfk_1`
    FOREIGN KEY (`chat_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_inbox_chats` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_inbox_messages_ibfk_2`
    FOREIGN KEY (`sender_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_inbox_messages_ibfk_3`
    FOREIGN KEY (`post_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_posts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_inbox_messages_ibfk_4`
    FOREIGN KEY (`reply_to_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_inbox_messages` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_inbox_message_reads` (
  `message_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `read_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`, `user_id`),
  KEY `idx_message_reads_user` (`user_id`),
  CONSTRAINT `dyscover_message_reads_ibfk_1`
    FOREIGN KEY (`message_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_inbox_messages` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_message_reads_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_inbox_message_hides` (
  `message_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `hidden_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`, `user_id`),
  KEY `idx_message_hides_user` (`user_id`),
  CONSTRAINT `dyscover_inbox_message_hides_ibfk_1`
    FOREIGN KEY (`message_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_inbox_messages` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_inbox_message_hides_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Source: dyscover/database/4-activity.sql
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_activity` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `recipient_id` BIGINT UNSIGNED NOT NULL,
  `actor_id` BIGINT UNSIGNED NOT NULL,
  `post_id` BIGINT UNSIGNED DEFAULT NULL,
  `group_id` BIGINT UNSIGNED DEFAULT NULL,
  `type` ENUM('like','comment','follow','share','message','mention') NOT NULL,
  `message` TEXT DEFAULT NULL,
  `viewed_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_activity_recipient` (`recipient_id`),
  KEY `idx_activity_actor` (`actor_id`),
  KEY `idx_activity_post` (`post_id`),
  KEY `idx_activity_group` (`group_id`),
  KEY `idx_activity_type` (`type`),
  KEY `idx_activity_read` (`viewed_at`),
  KEY `idx_activity_created` (`created_at`),
  CONSTRAINT `dyscover_activity_ibfk_1`
    FOREIGN KEY (`recipient_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_activity_ibfk_2`
    FOREIGN KEY (`actor_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_activity_ibfk_3`
    FOREIGN KEY (`post_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_posts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_activity_ibfk_4`
    FOREIGN KEY (`group_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_groups` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Source: dyscover/database/5-reports.sql
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reporter_user_id` BIGINT UNSIGNED NOT NULL,
  `target_type` ENUM('post','user') NOT NULL,
  `target_post_id` BIGINT UNSIGNED DEFAULT NULL,
  `target_user_id` BIGINT UNSIGNED DEFAULT NULL,
  `reason` VARCHAR(64) NOT NULL,
  `details` TEXT DEFAULT NULL,
  `status` ENUM('pending','reviewed','dismissed','actioned') NOT NULL DEFAULT 'pending',
  `review_note` TEXT DEFAULT NULL,
  `reviewed_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reports_status` (`status`),
  KEY `idx_reports_target_post` (`target_post_id`),
  KEY `idx_reports_target_user` (`target_user_id`),
  KEY `idx_reports_reporter` (`reporter_user_id`),
  KEY `idx_reports_created` (`created_at`),
  CONSTRAINT `dyscover_reports_ibfk_1`
    FOREIGN KEY (`reporter_user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_reports_ibfk_2`
    FOREIGN KEY (`target_post_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_posts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_reports_ibfk_3`
    FOREIGN KEY (`target_user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Source: dyscover/database/6-banned-terms.sql
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_banned_terms` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `term` VARCHAR(100) NOT NULL,
  `match_type` ENUM('exact','contains','word') NOT NULL DEFAULT 'contains',
  `reason` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_banned_term` (`term`)
);

-- ============================================================
-- Application: Dominions
-- Folder: dominions
-- Database: ielectro_dominions
-- ============================================================

-- Source: dominions/database/0-bootstrap.sql
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_account_id` (`account_id`)
);

-- Source: dominions/database/1-countries.sql
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`territories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` BIGINT UNSIGNED DEFAULT NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `capital_city` VARCHAR(150) DEFAULT NULL,
  `largest_city` VARCHAR(150) DEFAULT NULL,
  `population` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `area` DECIMAL(15,2) UNSIGNED DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `dominions_territories_ibfk_1`
    FOREIGN KEY (`parent_id`)
    REFERENCES `ielectro_dominions`.`territories` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_territories_ibfk_2`
    FOREIGN KEY (`created_by`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`countries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `official_name` VARCHAR(255) NOT NULL,
  `government_form` ENUM(
    'constitutional_monarchy',
    'absolute_monarchy',
    'parliamentary_monarchy',
    'presidential_republic',
    'semi_presidential_republic',
    'parliamentary_republic',
    'anarchy'
  ) NOT NULL,
  `political_regime` ENUM(
    'dictatorship',
    'military_junta',
    'authoritarian',
    'oligarchy',
    'theocracy',
    'technocracy',
    'tribal',
    'communism',
    'illiberal_democracy',
    'liberal_democracy'
  ) NOT NULL,
  `territorial_administration` ENUM(
    'empire',
    'federation',
    'confederation',
    'unitary'
  ) NOT NULL,
  `international_status` ENUM(
    'superpower',
    'great_power',
    'regional_power',
    'minor_power',
    'neutral_power'
  ) NOT NULL,
  `founded` INT DEFAULT NULL,
  `collapsed` INT DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_countries_territory_id` (`territory_id`),
  UNIQUE KEY `uq_countries_official_name` (`official_name`),
  CONSTRAINT `dominions_countries_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `ielectro_dominions`.`territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`country_languages` (
  `country_id` BIGINT UNSIGNED NOT NULL,
  `language` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`country_id`, `language`),
  CONSTRAINT `dominions_country_languages_ibfk_1`
    FOREIGN KEY (`country_id`)
    REFERENCES `ielectro_dominions`.`countries` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Source: dominions/database/2-politics.sql
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`factions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `ideology` VARCHAR(100) DEFAULT NULL,
  `color` CHAR(7) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_factions` (`territory_id`, `name`),
  KEY `idx_territory_id` (`territory_id`),
  CONSTRAINT `dominions_factions_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`statesmen` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `faction_id` BIGINT UNSIGNED DEFAULT NULL,
  `name` VARCHAR(100) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `birth` INT DEFAULT NULL,
  `death` INT DEFAULT NULL,
  `attack` TINYINT NOT NULL DEFAULT 0,
  `defense` TINYINT NOT NULL DEFAULT 0,
  `strategy` TINYINT NOT NULL DEFAULT 0,
  `logistics` TINYINT NOT NULL DEFAULT 0,
  `leadership` TINYINT NOT NULL DEFAULT 0,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_territory_id` (`territory_id`),
  KEY `idx_faction_id` (`faction_id`),
  CONSTRAINT `dominions_statesmen_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_statesmen_ibfk_2`
    FOREIGN KEY (`faction_id`)
    REFERENCES `ielectro_dominions`.`factions` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`leaders` (
    `territory_id` BIGINT UNSIGNED NOT NULL,
    `statesman_id` BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (`territory_id`),
    UNIQUE (`statesman_id`),
    CONSTRAINT `dominions_fk_leaders_territory`
        FOREIGN KEY (`territory_id`)
        REFERENCES `territories`(`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT `dominions_fk_leaders_statesman`
        FOREIGN KEY (`statesman_id`)
        REFERENCES `ielectro_dominions`.`statesmen`(`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`elections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `turnout` DECIMAL(5,2) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_territory_id` (`territory_id`),
  CONSTRAINT `dominions_elections_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`election_candidates` (
  `election_id` BIGINT UNSIGNED NOT NULL,
  `statesman_id` BIGINT UNSIGNED NOT NULL,
  `votes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`election_id`, `statesman_id`),
  KEY `idx_statesman_id` (`statesman_id`),
  CONSTRAINT `dominions_election_candidates_ibfk_1`
    FOREIGN KEY (`election_id`)
    REFERENCES `ielectro_dominions`.`elections` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_election_candidates_ibfk_2`
    FOREIGN KEY (`statesman_id`)
    REFERENCES `ielectro_dominions`.`statesmen` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Source: dominions/database/3-diplomacy.sql
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`organizations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `type` ENUM(
    'international',
    'military',
    'economic',
    'political',
    'religious',
    'scientific',
    'cultural',
    'sport',
    'other'
  ) NOT NULL DEFAULT 'international',
  `description` TEXT DEFAULT NULL,
  `founded` INT DEFAULT NULL,
  `dissolved` INT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_organizations_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`organization_members` (
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `country_id` BIGINT UNSIGNED NOT NULL,
  `joined` INT DEFAULT NULL,
  `left_at` INT DEFAULT NULL,
  PRIMARY KEY (`organization_id`, `country_id`),
  KEY `idx_country_id` (`country_id`),
  CONSTRAINT `dominions_organization_members_ibfk_1`
    FOREIGN KEY (`organization_id`)
    REFERENCES `ielectro_dominions`.`organizations` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_organization_members_ibfk_2`
    FOREIGN KEY (`country_id`)
    REFERENCES `countries` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`country_relations` (
  `country_id` BIGINT UNSIGNED NOT NULL,
  `target_country_id` BIGINT UNSIGNED NOT NULL,
  `relation` TINYINT NOT NULL DEFAULT 0,
  `description` TEXT DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`country_id`, `target_country_id`),
  KEY `idx_target_country_id` (`target_country_id`),
  CONSTRAINT `dominions_country_relations_ibfk_1`
    FOREIGN KEY (`country_id`)
    REFERENCES `countries` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_country_relations_ibfk_2`
    FOREIGN KEY (`target_country_id`)
    REFERENCES `countries` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`country_subjects` (
  `country_id` BIGINT UNSIGNED NOT NULL,
  `overlord_country_id` BIGINT UNSIGNED NOT NULL,
  `type` ENUM(
    'vassal',
    'tributary',
    'protectorate',
    'colony',
    'puppet_state',
    'personal_union',
    'client_state',
    'satellite_state',
    'mandate',
    'other'
  ) NOT NULL,
  `started` INT DEFAULT NULL,
  `ended` INT DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`country_id`, `overlord_country_id`),
  KEY `idx_overlord_country_id` (`overlord_country_id`),
  CONSTRAINT `dominions_country_subjects_ibfk_1`
    FOREIGN KEY (`country_id`)
    REFERENCES `countries` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_country_subjects_ibfk_2`
    FOREIGN KEY (`overlord_country_id`)
    REFERENCES `countries` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`treaties` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `type` ENUM(
    'peace',
    'alliance',
    'non_aggression',
    'trade',
    'defense',
    'military_access',
    'research',
    'border',
    'other'
  ) NOT NULL,
  `signed` INT DEFAULT NULL,
  `expired` INT DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`treaty_members` (
  `treaty_id` BIGINT UNSIGNED NOT NULL,
  `country_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`treaty_id`, `country_id`),
  KEY `idx_country_id` (`country_id`),
  CONSTRAINT `dominions_treaty_members_ibfk_1`
    FOREIGN KEY (`treaty_id`)
    REFERENCES `ielectro_dominions`.`treaties` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_treaty_members_ibfk_2`
    FOREIGN KEY (`country_id`)
    REFERENCES `countries` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Source: dominions/database/4-population.sql
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`population` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `ielectro_dominions`.`population` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `birth_rate` DECIMAL(6,3) DEFAULT NULL,
  `death_rate` DECIMAL(6,3) DEFAULT NULL,
  `growth_rate` DECIMAL(6,3) DEFAULT NULL,
  `average_age` DECIMAL(5,2) DEFAULT NULL,
  `life_expectancy` DECIMAL(5,2) DEFAULT NULL,
  `education` DECIMAL(5,2) DEFAULT NULL,
  `wealth` DECIMAL(15,2) DEFAULT NULL,
  `happiness` DECIMAL(5,2) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_territory_id` (`territory_id`),
  CONSTRAINT `dominions_population_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`ethnicities` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`territory_ethnicities` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `ethnicity_id` BIGINT UNSIGNED NOT NULL,
  `ielectro_dominions`.`population` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`territory_id`, `ethnicity_id`),
  KEY `idx_ethnicity_id` (`ethnicity_id`),
  CONSTRAINT `dominions_territory_ethnicities_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_territory_ethnicities_ibfk_2`
    FOREIGN KEY (`ethnicity_id`)
    REFERENCES `ielectro_dominions`.`ethnicities` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`religions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`territory_religions` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `religion_id` BIGINT UNSIGNED NOT NULL,
  `ielectro_dominions`.`population` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`territory_id`, `religion_id`),
  KEY `idx_religion_id` (`religion_id`),
  CONSTRAINT `dominions_territory_religions_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_territory_religions_ibfk_2`
    FOREIGN KEY (`religion_id`)
    REFERENCES `ielectro_dominions`.`religions` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`languages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `iso_code` VARCHAR(10) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`territory_languages` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `language_id` BIGINT UNSIGNED NOT NULL,
  `ielectro_dominions`.`population` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `is_official` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`territory_id`, `language_id`),
  KEY `idx_language_id` (`language_id`),
  CONSTRAINT `dominions_territory_languages_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_territory_languages_ibfk_2`
    FOREIGN KEY (`language_id`)
    REFERENCES `ielectro_dominions`.`languages` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`genders` (
  `id` TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`territory_genders` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `gender_id` TINYINT UNSIGNED NOT NULL,
  `ielectro_dominions`.`population` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`territory_id`, `gender_id`),
  KEY `idx_gender_id` (`gender_id`),
  CONSTRAINT `dominions_territory_genders_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_territory_genders_ibfk_2`
    FOREIGN KEY (`gender_id`)
    REFERENCES `ielectro_dominions`.`genders` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`age_groups` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `minimum_age` SMALLINT UNSIGNED NOT NULL,
  `maximum_age` SMALLINT UNSIGNED DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`territory_age_groups` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `age_group_id` BIGINT UNSIGNED NOT NULL,
  `ielectro_dominions`.`population` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`territory_id`, `age_group_id`),
  KEY `idx_age_group_id` (`age_group_id`),
  CONSTRAINT `dominions_territory_age_groups_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_territory_age_groups_ibfk_2`
    FOREIGN KEY (`age_group_id`)
    REFERENCES `ielectro_dominions`.`age_groups` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Source: dominions/database/5-military.sql
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`military_branches` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_military_branches` (`territory_id`, `name`),
  CONSTRAINT `dominions_military_branches_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`military_commanders` (
  `statesman_id` BIGINT UNSIGNED NOT NULL,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `rank` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`statesman_id`),
  KEY `idx_branch_id` (`branch_id`),
  CONSTRAINT `dominions_military_commanders_ibfk_1`
    FOREIGN KEY (`statesman_id`)
    REFERENCES `statesmen` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_military_commanders_ibfk_2`
    FOREIGN KEY (`branch_id`)
    REFERENCES `ielectro_dominions`.`military_branches` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`military_bases` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `commander_id` BIGINT UNSIGNED DEFAULT NULL,
  `name` VARCHAR(150) NOT NULL,
  `type` ENUM(
    'headquarters',
    'army_base',
    'naval_base',
    'air_base',
    'intelligence_center',
    'logistics_base',
    'missile_base',
    'space_base',
    'training_base',
    'other'
  ) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_territory_id` (`territory_id`),
  KEY `idx_branch_id` (`branch_id`),
  KEY `idx_commander_id` (`commander_id`),
  CONSTRAINT `dominions_military_bases_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_military_bases_ibfk_2`
    FOREIGN KEY (`branch_id`)
    REFERENCES `ielectro_dominions`.`military_branches` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_military_bases_ibfk_3`
    FOREIGN KEY (`commander_id`)
    REFERENCES `ielectro_dominions`.`military_commanders` (`statesman_id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`military_units` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `parent_id` BIGINT UNSIGNED DEFAULT NULL,
  `base_id` BIGINT UNSIGNED DEFAULT NULL,
  `commander_id` BIGINT UNSIGNED DEFAULT NULL,
  `name` VARCHAR(150) NOT NULL,
  `designation` VARCHAR(100) DEFAULT NULL,
  `active_personnel` INT UNSIGNED NOT NULL DEFAULT 0,
  `reserve_personnel` INT UNSIGNED NOT NULL DEFAULT 0,
  `experience` TINYINT NOT NULL DEFAULT 0,
  `morale` TINYINT NOT NULL DEFAULT 0,
  `readiness` TINYINT NOT NULL DEFAULT 0,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_territory_id` (`territory_id`),
  KEY `idx_branch_id` (`branch_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_base_id` (`base_id`),
  KEY `idx_commander_id` (`commander_id`),
  CONSTRAINT `dominions_military_units_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_military_units_ibfk_2`
    FOREIGN KEY (`branch_id`)
    REFERENCES `ielectro_dominions`.`military_branches` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_military_units_ibfk_3`
    FOREIGN KEY (`parent_id`)
    REFERENCES `ielectro_dominions`.`military_units` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_military_units_ibfk_4`
    FOREIGN KEY (`base_id`)
    REFERENCES `ielectro_dominions`.`military_bases` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_military_units_ibfk_5`
    FOREIGN KEY (`commander_id`)
    REFERENCES `ielectro_dominions`.`military_commanders` (`statesman_id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`military_equipment` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `attack` TINYINT NOT NULL DEFAULT 0,
  `defense` TINYINT NOT NULL DEFAULT 0,
  `mobility` TINYINT NOT NULL DEFAULT 0,
  `range` TINYINT NOT NULL DEFAULT 0,
  `cost` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `maintenance_cost` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_territory_id` (`territory_id`),
  CONSTRAINT `dominions_military_equipment_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`military_stockpile` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `equipment_id` BIGINT UNSIGNED NOT NULL,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`territory_id`, `equipment_id`),
  KEY `idx_equipment_id` (`equipment_id`),
  CONSTRAINT `dominions_military_stockpile_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_military_stockpile_ibfk_2`
    FOREIGN KEY (`equipment_id`)
    REFERENCES `ielectro_dominions`.`military_equipment` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`military_unit_equipment` (
  `unit_id` BIGINT UNSIGNED NOT NULL,
  `equipment_id` BIGINT UNSIGNED NOT NULL,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`unit_id`, `equipment_id`),
  KEY `idx_equipment_id` (`equipment_id`),
  CONSTRAINT `dominions_military_unit_equipment_ibfk_1`
    FOREIGN KEY (`unit_id`)
    REFERENCES `ielectro_dominions`.`military_units` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_military_unit_equipment_ibfk_2`
    FOREIGN KEY (`equipment_id`)
    REFERENCES `ielectro_dominions`.`military_equipment` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Source: dominions/database/6-economy.sql
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`currencies` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` CHAR(3) DEFAULT NULL,
  `symbol` VARCHAR(10) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_currencies_name` (`name`),
  UNIQUE KEY `uq_currencies_code` (`code`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`territory_economies` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `currency_id` BIGINT UNSIGNED DEFAULT NULL,
  `gdp` DECIMAL(20,2) UNSIGNED DEFAULT NULL,
  `gdp_per_capita` DECIMAL(20,2) UNSIGNED DEFAULT NULL,
  `budget` DECIMAL(20,2) UNSIGNED DEFAULT NULL,
  `income` DECIMAL(20,2) UNSIGNED DEFAULT NULL,
  `expenses` DECIMAL(20,2) UNSIGNED DEFAULT NULL,
  `debt` DECIMAL(20,2) UNSIGNED DEFAULT NULL,
  `inflation` DECIMAL(6,2) DEFAULT NULL,
  `unemployment` DECIMAL(5,2) DEFAULT NULL,
  `tax_rate` DECIMAL(5,2) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`territory_id`),
  KEY `idx_currency_id` (`currency_id`),
  CONSTRAINT `dominions_territory_economies_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_territory_economies_ibfk_2`
    FOREIGN KEY (`currency_id`)
    REFERENCES `ielectro_dominions`.`currencies` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`resources` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_resources_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`territory_resources` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `resource_id` BIGINT UNSIGNED NOT NULL,
  `production` DECIMAL(20,2) NOT NULL DEFAULT 0,
  `consumption` DECIMAL(20,2) NOT NULL DEFAULT 0,
  `stockpile` DECIMAL(20,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`territory_id`, `resource_id`),
  KEY `idx_resource_id` (`resource_id`),
  CONSTRAINT `dominions_territory_resources_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_territory_resources_ibfk_2`
    FOREIGN KEY (`resource_id`)
    REFERENCES `ielectro_dominions`.`resources` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`industries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_industries_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`territory_industries` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `industry_id` BIGINT UNSIGNED NOT NULL,
  `employees` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `production_value` DECIMAL(20,2) UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`territory_id`, `industry_id`),
  KEY `idx_industry_id` (`industry_id`),
  CONSTRAINT `dominions_territory_industries_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_territory_industries_ibfk_2`
    FOREIGN KEY (`industry_id`)
    REFERENCES `ielectro_dominions`.`industries` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
