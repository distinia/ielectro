CREATE TABLE IF NOT EXISTS `ielectro_dyscover`.`dyscover_banned_terms` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `term` VARCHAR(100) NOT NULL,
  `match_type` ENUM('exact','contains','word') NOT NULL DEFAULT 'contains',
  `reason` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_banned_term` (`term`)
);
