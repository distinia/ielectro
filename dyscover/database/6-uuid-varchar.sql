-- Standard RFC 4122 UUIDs (36 chars with dashes)
ALTER TABLE `ielectro_dyscover`.`dyscover_posts`
    MODIFY `uuid` CHAR(36) NOT NULL;
