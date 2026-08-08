CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`military_branches` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_military_branches` (`territory_id`, `name`),
  CONSTRAINT `military_branches_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`military_commanders` (
  `statesman_id` BIGINT UNSIGNED NOT NULL,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `rank` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`statesman_id`),
  KEY `idx_branch_id` (`branch_id`),
  CONSTRAINT `military_commanders_ibfk_1`
    FOREIGN KEY (`statesman_id`)
    REFERENCES `statesmen` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `military_commanders_ibfk_2`
    FOREIGN KEY (`branch_id`)
    REFERENCES `ielectro_dominions`.`military_branches` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`military_bases` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `commander_id` BIGINT UNSIGNED DEFAULT NULL,
  `name` VARCHAR(150) NOT NULL,
  `type` ENUM(
    'headquarters',
    'army_base',
    'naval_base',
    'air_base',
    'intelligence_center',
    'logistics_base',
    'missile_base',
    'space_base',
    'training_base',
    'other'
  ) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_territory_id` (`territory_id`),
  KEY `idx_branch_id` (`branch_id`),
  KEY `idx_commander_id` (`commander_id`),
  CONSTRAINT `military_bases_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `military_bases_ibfk_2`
    FOREIGN KEY (`branch_id`)
    REFERENCES `ielectro_dominions`.`military_branches` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `military_bases_ibfk_3`
    FOREIGN KEY (`commander_id`)
    REFERENCES `ielectro_dominions`.`military_commanders` (`statesman_id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`military_units` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `parent_id` BIGINT UNSIGNED DEFAULT NULL,
  `base_id` BIGINT UNSIGNED DEFAULT NULL,
  `commander_id` BIGINT UNSIGNED DEFAULT NULL,
  `name` VARCHAR(150) NOT NULL,
  `designation` VARCHAR(100) DEFAULT NULL,
  `active_personnel` INT UNSIGNED NOT NULL DEFAULT 0,
  `reserve_personnel` INT UNSIGNED NOT NULL DEFAULT 0,
  `experience` TINYINT NOT NULL DEFAULT 0,
  `morale` TINYINT NOT NULL DEFAULT 0,
  `readiness` TINYINT NOT NULL DEFAULT 0,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_territory_id` (`territory_id`),
  KEY `idx_branch_id` (`branch_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_base_id` (`base_id`),
  KEY `idx_commander_id` (`commander_id`),
  CONSTRAINT `military_units_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `military_units_ibfk_2`
    FOREIGN KEY (`branch_id`)
    REFERENCES `ielectro_dominions`.`military_branches` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `military_units_ibfk_3`
    FOREIGN KEY (`parent_id`)
    REFERENCES `ielectro_dominions`.`military_units` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `military_units_ibfk_4`
    FOREIGN KEY (`base_id`)
    REFERENCES `ielectro_dominions`.`military_bases` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `military_units_ibfk_5`
    FOREIGN KEY (`commander_id`)
    REFERENCES `ielectro_dominions`.`military_commanders` (`statesman_id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`military_equipment` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `attack` TINYINT NOT NULL DEFAULT 0,
  `defense` TINYINT NOT NULL DEFAULT 0,
  `mobility` TINYINT NOT NULL DEFAULT 0,
  `range` TINYINT NOT NULL DEFAULT 0,
  `cost` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `maintenance_cost` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_territory_id` (`territory_id`),
  CONSTRAINT `military_equipment_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`military_stockpile` (
  `territory_id` BIGINT UNSIGNED NOT NULL,
  `equipment_id` BIGINT UNSIGNED NOT NULL,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`territory_id`, `equipment_id`),
  KEY `idx_equipment_id` (`equipment_id`),
  CONSTRAINT `military_stockpile_ibfk_1`
    FOREIGN KEY (`territory_id`)
    REFERENCES `territories` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `military_stockpile_ibfk_2`
    FOREIGN KEY (`equipment_id`)
    REFERENCES `ielectro_dominions`.`military_equipment` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`military_unit_equipment` (
  `unit_id` BIGINT UNSIGNED NOT NULL,
  `equipment_id` BIGINT UNSIGNED NOT NULL,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`unit_id`, `equipment_id`),
  KEY `idx_equipment_id` (`equipment_id`),
  CONSTRAINT `military_unit_equipment_ibfk_1`
    FOREIGN KEY (`unit_id`)
    REFERENCES `ielectro_dominions`.`military_units` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `military_unit_equipment_ibfk_2`
    FOREIGN KEY (`equipment_id`)
    REFERENCES `ielectro_dominions`.`military_equipment` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);