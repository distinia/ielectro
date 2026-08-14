ALTER TABLE `ielectro_admin`.`team`
    ADD COLUMN `account_id` BIGINT UNSIGNED NULL AFTER `uuid`,
    ADD KEY `idx_team_account` (`account_id`);
