-- Add single-image field type; migrate legacy image -> single-image (keep large-image)
ALTER TABLE `ielectro_dyscover`.`dyscover_template_fields`
  MODIFY COLUMN `type` ENUM(
    'image',
    'large-image',
    'single-image',
    'double-image',
    'definition',
    'text',
    'double-column',
    'double-column-extended'
  ) NOT NULL;

UPDATE `ielectro_dyscover`.`dyscover_template_fields`
SET `type` = 'single-image'
WHERE `type` = 'image';

UPDATE `ielectro_dyscover`.`dyscover_template_fields`
SET `type` = 'single-image'
WHERE LOWER(`name`) REGEXP '(^| )logo( |$)';

UPDATE `ielectro_dyscover`.`dyscover_template_fields`
SET `type` = 'large-image'
WHERE LOWER(`name`) REGEXP '(^| )map( |$)';

ALTER TABLE `ielectro_dyscover`.`dyscover_template_fields`
  MODIFY COLUMN `type` ENUM(
    'single-image',
    'large-image',
    'double-image',
    'definition',
    'text',
    'double-column',
    'double-column-extended'
  ) NOT NULL;
