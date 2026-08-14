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
