CREATE TABLE IF NOT EXISTS `population` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `population` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `birth_rate` DECIMAL(6,3) DEFAULT NULL,
  `death_rate` DECIMAL(6,3) DEFAULT NULL,
  `growth_rate` DECIMAL(6,3) DEFAULT NULL,
  `average_age` DECIMAL(5,2) DEFAULT NULL,
  `life_expectancy` DECIMAL(5,2) DEFAULT NULL,
  `education` DECIMAL(5,2) DEFAULT NULL,
  `wealth` DECIMAL(15,2) DEFAULT NULL,
  `happiness` DECIMAL(5,2) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_territory_id` (`territory_id`),
  CONSTRAINT `population_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ethnicities` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `territory_ethnicities` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `ethnicity_id` BIGINT UNSIGNED NOT NULL,
  `population` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`territory_id`, `ethnicity_id`),
  KEY `idx_ethnicity_id` (`ethnicity_id`),
  CONSTRAINT `territory_ethnicities_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `territory_ethnicities_ibfk_2`
    FOREIGN KEY (`ethnicity_id`)
    REFERENCES `ethnicities` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `religions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `territory_religions` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `religion_id` BIGINT UNSIGNED NOT NULL,
  `population` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`territory_id`, `religion_id`),
  KEY `idx_religion_id` (`religion_id`),
  CONSTRAINT `territory_religions_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `territory_religions_ibfk_2`
    FOREIGN KEY (`religion_id`)
    REFERENCES `religions` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `languages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `iso_code` VARCHAR(10) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `territory_languages` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `language_id` BIGINT UNSIGNED NOT NULL,
  `population` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `is_official` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`territory_id`, `language_id`),
  KEY `idx_language_id` (`language_id`),
  CONSTRAINT `territory_languages_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `territory_languages_ibfk_2`
    FOREIGN KEY (`language_id`)
    REFERENCES `languages` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `genders` (
  `id` TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `territory_genders` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `gender_id` TINYINT UNSIGNED NOT NULL,
  `population` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`territory_id`, `gender_id`),
  KEY `idx_gender_id` (`gender_id`),
  CONSTRAINT `territory_genders_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `territory_genders_ibfk_2`
    FOREIGN KEY (`gender_id`)
    REFERENCES `genders` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `age_groups` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `minimum_age` SMALLINT UNSIGNED NOT NULL,
  `maximum_age` SMALLINT UNSIGNED DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `territory_age_groups` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `age_group_id` BIGINT UNSIGNED NOT NULL,
  `population` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`territory_id`, `age_group_id`),
  KEY `idx_age_group_id` (`age_group_id`),
  CONSTRAINT `territory_age_groups_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `territory_age_groups_ibfk_2`
    FOREIGN KEY (`age_group_id`)
    REFERENCES `age_groups` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);