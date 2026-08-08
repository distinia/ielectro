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
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_inbox_message_reactions` (
  `message_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `emoji` VARCHAR(20) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`, `user_id`),
  KEY `idx_reactions_user` (`user_id`),
  CONSTRAINT `dyscover_message_reactions_ibfk_1`
    FOREIGN KEY (`message_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_inbox_messages` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_message_reactions_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_inbox_typing` (
  `chat_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`chat_id`, `user_id`),
  KEY `idx_typing_updated` (`updated_at`),
  KEY `idx_typing_user` (`user_id`),
  CONSTRAINT `dyscover_inbox_typing_ibfk_1`
    FOREIGN KEY (`chat_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_inbox_chats` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dyscover_inbox_typing_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `ielectro_dyscover`.`dyscover_users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);