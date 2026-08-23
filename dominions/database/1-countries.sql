CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`dominions_territories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` BIGINT UNSIGNED DEFAULT NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `capital_city` VARCHAR(150) DEFAULT NULL,
  `largest_city` VARCHAR(150) DEFAULT NULL,
  `population` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `area` DECIMAL(15,2) UNSIGNED DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `dominions_territories_ibfk_1`
    FOREIGN KEY (`parent_id`)
    REFERENCES `ielectro_dominions`.`dominions_territories` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_territories_ibfk_2`
    FOREIGN KEY (`created_by`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`dominions_countries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `official_name` VARCHAR(255) NOT NULL,
  `government_form` ENUM(
    'constitutional_monarchy',
    'absolute_monarchy',
    'parliamentary_monarchy',
    'presidential_republic',
    'semi_presidential_republic',
    'parliamentary_republic',
    'anarchy'
  ) NOT NULL,
  `political_regime` ENUM(
    'dictatorship',
    'military_junta',
    'authoritarian',
    'oligarchy',
    'theocracy',
    'technocracy',
    'tribal',
    'communism',
    'illiberal_democracy',
    'liberal_democracy'
  ) NOT NULL,
  `territorial_administration` ENUM(
    'empire',
    'federation',
    'confederation',
    'unitary'
  ) NOT NULL,
  `international_status` ENUM(
    'superpower',
    'great_power',
    'regional_power',
    'minor_power',
    'neutral_power'
  ) NOT NULL,
  `founded` INT DEFAULT NULL,
  `collapsed` INT DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_countries_territory_id` (`territory_id`),
  UNIQUE KEY `uq_countries_official_name` (`official_name`),
  CONSTRAINT `dominions_countries_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `ielectro_dominions`.`dominions_territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`dominions_country_languages` (
  `country_id` BIGINT UNSIGNED NOT NULL,
  `language` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`country_id`, `language`),
  CONSTRAINT `dominions_country_languages_ibfk_1`
    FOREIGN KEY (`country_id`)
    REFERENCES `ielectro_dominions`.`dominions_countries` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);