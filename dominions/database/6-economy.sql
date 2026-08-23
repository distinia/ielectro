CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`dominions_currencies` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `code` CHAR(3) DEFAULT NULL,
  `symbol` VARCHAR(10) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_currencies_name` (`name`),
  UNIQUE KEY `uq_currencies_code` (`code`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`dominions_territory_economies` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `currency_id` BIGINT UNSIGNED DEFAULT NULL,
  `gdp` DECIMAL(20,2) UNSIGNED DEFAULT NULL,
  `gdp_per_capita` DECIMAL(20,2) UNSIGNED DEFAULT NULL,
  `budget` DECIMAL(20,2) UNSIGNED DEFAULT NULL,
  `income` DECIMAL(20,2) UNSIGNED DEFAULT NULL,
  `expenses` DECIMAL(20,2) UNSIGNED DEFAULT NULL,
  `debt` DECIMAL(20,2) UNSIGNED DEFAULT NULL,
  `inflation` DECIMAL(6,2) DEFAULT NULL,
  `unemployment` DECIMAL(5,2) DEFAULT NULL,
  `tax_rate` DECIMAL(5,2) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`territory_id`),
  KEY `idx_currency_id` (`currency_id`),
  CONSTRAINT `dominions_territory_economies_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_territory_economies_ibfk_2`
    FOREIGN KEY (`currency_id`)
    REFERENCES `ielectro_dominions`.`dominions_currencies` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`dominions_resources` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_resources_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`dominions_territory_resources` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `resource_id` BIGINT UNSIGNED NOT NULL,
  `production` DECIMAL(20,2) NOT NULL DEFAULT 0,
  `consumption` DECIMAL(20,2) NOT NULL DEFAULT 0,
  `stockpile` DECIMAL(20,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`territory_id`, `resource_id`),
  KEY `idx_resource_id` (`resource_id`),
  CONSTRAINT `dominions_territory_resources_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_territory_resources_ibfk_2`
    FOREIGN KEY (`resource_id`)
    REFERENCES `ielectro_dominions`.`dominions_resources` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`dominions_industries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_industries_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`dominions_territory_industries` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `industry_id` BIGINT UNSIGNED NOT NULL,
  `employees` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `production_value` DECIMAL(20,2) UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`territory_id`, `industry_id`),
  KEY `idx_industry_id` (`industry_id`),
  CONSTRAINT `dominions_territory_industries_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_territory_industries_ibfk_2`
    FOREIGN KEY (`industry_id`)
    REFERENCES `ielectro_dominions`.`dominions_industries` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);