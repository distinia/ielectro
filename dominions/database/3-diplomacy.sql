CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`dominions_organizations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `type` ENUM(
    'international',
    'military',
    'economic',
    'political',
    'religious',
    'scientific',
    'cultural',
    'sport',
    'other'
  ) NOT NULL DEFAULT 'international',
  `description` TEXT DEFAULT NULL,
  `founded` INT DEFAULT NULL,
  `dissolved` INT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_organizations_name` (`name`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`dominions_organization_members` (
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `country_id` BIGINT UNSIGNED NOT NULL,
  `joined` INT DEFAULT NULL,
  `left_at` INT DEFAULT NULL,
  PRIMARY KEY (`organization_id`, `country_id`),
  KEY `idx_country_id` (`country_id`),
  CONSTRAINT `dominions_organization_members_ibfk_1`
    FOREIGN KEY (`organization_id`)
    REFERENCES `ielectro_dominions`.`dominions_organizations` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_organization_members_ibfk_2`
    FOREIGN KEY (`country_id`)
    REFERENCES `countries` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`dominions_country_relations` (
  `country_id` BIGINT UNSIGNED NOT NULL,
  `target_country_id` BIGINT UNSIGNED NOT NULL,
  `relation` TINYINT NOT NULL DEFAULT 0,
  `description` TEXT DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`country_id`, `target_country_id`),
  KEY `idx_target_country_id` (`target_country_id`),
  CONSTRAINT `dominions_country_relations_ibfk_1`
    FOREIGN KEY (`country_id`)
    REFERENCES `countries` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_country_relations_ibfk_2`
    FOREIGN KEY (`target_country_id`)
    REFERENCES `countries` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`dominions_country_subjects` (
  `country_id` BIGINT UNSIGNED NOT NULL,
  `overlord_country_id` BIGINT UNSIGNED NOT NULL,
  `type` ENUM(
    'vassal',
    'tributary',
    'protectorate',
    'colony',
    'puppet_state',
    'personal_union',
    'client_state',
    'satellite_state',
    'mandate',
    'other'
  ) NOT NULL,
  `started` INT DEFAULT NULL,
  `ended` INT DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  PRIMARY KEY (`country_id`, `overlord_country_id`),
  KEY `idx_overlord_country_id` (`overlord_country_id`),
  CONSTRAINT `dominions_country_subjects_ibfk_1`
    FOREIGN KEY (`country_id`)
    REFERENCES `countries` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_country_subjects_ibfk_2`
    FOREIGN KEY (`overlord_country_id`)
    REFERENCES `countries` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`dominions_treaties` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `type` ENUM(
    'peace',
    'alliance',
    'non_aggression',
    'trade',
    'defense',
    'military_access',
    'research',
    'border',
    'other'
  ) NOT NULL,
  `signed` INT DEFAULT NULL,
  `expired` INT DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
CREATE TABLE IF NOT EXISTS `ielectro_dominions`.`dominions_treaty_members` (
  `treaty_id` BIGINT UNSIGNED NOT NULL,
  `country_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`treaty_id`, `country_id`),
  KEY `idx_country_id` (`country_id`),
  CONSTRAINT `dominions_treaty_members_ibfk_1`
    FOREIGN KEY (`treaty_id`)
    REFERENCES `ielectro_dominions`.`dominions_treaties` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `dominions_treaty_members_ibfk_2`
    FOREIGN KEY (`country_id`)
    REFERENCES `countries` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);