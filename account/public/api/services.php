<?php
namespace Account;
use Nesh\Query;
use Nesh\File;
class Services
{
    public static function create(int $accountId): void
    {
        Dyscover::create($accountId);
        Dominions::create($accountId);
    }
    public static function delete(int $accountId): void
    {
        Dyscover::delete($accountId);
        Dominions::delete($accountId);
    }
}
class Dyscover
{
    public static function create(int $accountId): void
    {
        Query::execute(
            "INSERT INTO dyscover_users (account_id)
            VALUES (?)",
            [$accountId]
        );
        File::copyDirectory(
            ROOT_PATH . '/dyscover/public/assets/default-user',
            ROOT_PATH . '/dyscover/public/assets/users/' . $accountId
        );
    }
   public static function delete(int $accountId): void
    {
        Query::execute(
            "DELETE
            FROM dyscover_users
            WHERE account_id = ?",
            [$accountId]
        );
       File::deleteDirectory(
            ROOT_PATH . '/dyscover/public/assets/users/' . $accountId
        );
    }
}
class Dominions
{
    public static function create(int $accountId): void
    {
        Query::execute(
            "INSERT INTO dominions_users (account_id)
            VALUES (?)",
            [$accountId]
        );
    }
    public static function delete(int $accountId): void
    {
        Query::execute(
            "DELETE
            FROM dominions_users
            WHERE account_id = ?",
            [$accountId]
        );
    }
}