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
  CONSTRAINT `follows_ibfk_1`
    FOREIGN KEY (`follower_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `follows_ibfk_2`
    FOREIGN KEY (`followed_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);