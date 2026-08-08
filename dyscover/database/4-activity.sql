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