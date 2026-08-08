CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`factions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `ideology` VARCHAR(100) DEFAULT NULL,
  `color` CHAR(7) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_factions` (`territory_id`, `name`),
  KEY `idx_territory_id` (`territory_id`),
  CONSTRAINT `factions_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`statesmen` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `faction_id` BIGINT UNSIGNED DEFAULT NULL,
  `name` VARCHAR(100) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `birth` INT DEFAULT NULL,
  `death` INT DEFAULT NULL,
  `attack` TINYINT NOT NULL DEFAULT 0,
  `defense` TINYINT NOT NULL DEFAULT 0,
  `strategy` TINYINT NOT NULL DEFAULT 0,
  `logistics` TINYINT NOT NULL DEFAULT 0,
  `leadership` TINYINT NOT NULL DEFAULT 0,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_territory_id` (`territory_id`),
  KEY `idx_faction_id` (`faction_id`),
  CONSTRAINT `statesmen_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `statesmen_ibfk_2`
    FOREIGN KEY (`faction_id`)
    REFERENCES `ielectro_dominions`.`factions` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`leaders` (
    `territory_id` BIGINT UNSIGNED NOT NULL,
    `statesman_id` BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (`territory_id`),
    UNIQUE (`statesman_id`),
    CONSTRAINT `fk_leaders_territory`
        FOREIGN KEY (`territory_id`)
        REFERENCES `territories`(`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT `fk_leaders_statesman`
        FOREIGN KEY (`statesman_id`)
        REFERENCES `ielectro_dominions`.`statesmen`(`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`elections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `turnout` DECIMAL(5,2) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_territory_id` (`territory_id`),
  CONSTRAINT `elections_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`election_candidates` (
  `election_id` BIGINT UNSIGNED NOT NULL,
  `statesman_id` BIGINT UNSIGNED NOT NULL,
  `votes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`election_id`, `statesman_id`),
  KEY `idx_statesman_id` (`statesman_id`),
  CONSTRAINT `election_candidates_ibfk_1`
    FOREIGN KEY (`election_id`)
    REFERENCES `ielectro_dominions`.`elections` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `election_candidates_ibfk_2`
    FOREIGN KEY (`statesman_id`)
    REFERENCES `ielectro_dominions`.`statesmen` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);