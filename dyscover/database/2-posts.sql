CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_posts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `uuid` CHAR(16) NOT NULL,
  `type` ENUM('article','image','video','audio','document','template') NOT NULL,
  `title` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `extension` VARCHAR(10) DEFAULT NULL,
  `preview_image` VARCHAR(255) DEFAULT NULL,
  `visibility` ENUM('public','private','unlisted') DEFAULT 'public',
  `allow_comments` BOOLEAN DEFAULT TRUE,
  `allow_shares` BOOLEAN DEFAULT TRUE,
  `status` ENUM('active','hidden') DEFAULT 'active',
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
  `body` TEXT NOT NULL,
  `status` ENUM('active','hidden') DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_post_comments_post` (`post_id`),
  KEY `idx_post_comments_user` (`user_id`),
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
  `type` ENUM('image', 'large-image', 'double-image', 'definition', 'text', 'double-column', 'double-column-extended') NOT NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_template_fields_template` (`template_id`),
  CONSTRAINT `dyscover_template_fields_ibfk_1`
    FOREIGN KEY (`template_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_posts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);