CREATE TABLE IF NOT EXISTS `dyscover_groups` (
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
    REFERENCES `dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `dyscover_group_members` (
  `group_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role` ENUM('owner','admin','moderator','member') DEFAULT 'member',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`group_id`, `user_id`),
  KEY `idx_group_members_user` (`user_id`),
  CONSTRAINT `dyscover_group_members_ibfk_1`
    FOREIGN KEY (`group_id`)
    REFERENCES `dyscover_groups` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_group_members_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);