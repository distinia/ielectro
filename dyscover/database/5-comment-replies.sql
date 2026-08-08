ALTER TABLE `ielectro_dyscover`.`dyscover_post_comments`
  ADD COLUMN `parent_id` BIGINT UNSIGNED DEFAULT NULL AFTER `user_id`,
  ADD KEY `idx_post_comments_parent` (`parent_id`),
  ADD CONSTRAINT `dyscover_post_comments_ibfk_3`
    FOREIGN KEY (`parent_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_post_comments` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

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
