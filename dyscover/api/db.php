<?php
namespace Dyscover;

class Db
{
    public static function useDyscover(): void
    {
        $GLOBALS['dyscover']->database->use();
    }

    public static function useAccount(): void
    {
        $GLOBALS['account']->database->use();
    }

    public static function accountsTable(): string
    {
        return '`' . $GLOBALS['account']->database->name . '`.`accounts`';
    }

    public static function joinAccounts(string $alias = 'a', string $localKey = 'du.account_id'): string
    {
        return 'INNER JOIN ' . self::accountsTable() . " {$alias} ON {$alias}.id = {$localKey}";
    }
}
