CREATE TABLE IF NOT EXISTS `ielectro_admin`.`www_page_views` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `path` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_www_page_views_path` (`path`),
  KEY `idx_www_page_views_created` (`created_at`)
);
