ALTER TABLE `ielectro_dyscover`.`dyscover_posts`
  MODIFY COLUMN `status` ENUM('active','hidden','removed') NOT NULL DEFAULT 'active';
