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
        $GLOBALS['dyscover']->database->use();
        Query::execute(
            "INSERT INTO users (account_id)
            VALUES (?)",
            [$accountId]
        );
        File::copyDirectory(
            ROOT_PATH . '/dyscover/assets/default-user',
            ROOT_PATH . '/dyscover/assets/users/' . $accountId
        );
    }
   public static function delete(int $accountId): void
    {
        $GLOBALS['dyscover']->database->use();
        Query::execute(
            "DELETE
            FROM users
            WHERE account_id = ?",
            [$accountId]
        );
       File::deleteDirectory(
            ROOT_PATH . '/dyscover/assets/users/' . $accountId
        );
    }
}
class Dominions
{
    public static function create(int $accountId): void
    {
        $GLOBALS['dominions']->database->use();
        Query::execute(
            "INSERT INTO users (account_id)
            VALUES (?)",
            [$accountId]
        );
    }
    public static function delete(int $accountId): void
    {
        $GLOBALS['dominions']->database->use();
        Query::execute(
            "DELETE
            FROM users
            WHERE account_id = ?",
            [$accountId]
        );
    }
}