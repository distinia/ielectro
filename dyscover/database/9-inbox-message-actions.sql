ALTER TABLE `ielectro_dyscover`.`dyscover_inbox_messages`
  ADD COLUMN `redacted` TINYINT(1) NOT NULL DEFAULT 0 AFTER `attachment`;

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
