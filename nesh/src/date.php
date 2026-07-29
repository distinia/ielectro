<?php
namespace Nesh;
class Date
{
    public static function now(string $format = 'Y-m-d H:i:s'): string
    {
        return date($format);
    }
    public static function today(string $format = 'Y-m-d'): string
    {
        return date($format);
    }
    public static function timestamp(): int
    {
        return time();
    }
    public static function format(string|int $date, string $format = 'Y-m-d H:i:s'): string
    {
        if (is_numeric($date)) {
            return date($format, (int) $date);
        }
        return date($format, strtotime($date));
    }
    public static function parse(string $date): int
    {
        return strtotime($date);
    }
    public static function add(string|int $date, string $modifier, string $format = 'Y-m-d H:i:s'): string
    {
        $timestamp = is_numeric($date)
            ? (int) $date
            : \strtotime($date);
        return date(
            $format,
            strtotime($modifier, $timestamp)
        );
    }
    public static function subtract(string|int $date, string $modifier, string $format = 'Y-m-d H:i:s'): string
    {
        return self::add($date, '-'.ltrim($modifier, '-'), $format);
    }
    public static function difference(string|int $from, string|int $to): \DateInterval
    {
        $from = new \DateTime(is_numeric($from) ? '@'.$from : $from);
        $to = new \DateTime(is_numeric($to) ? '@'.$to : $to);
        return $from->diff($to);
    }
    public static function age(string $date): int
    {
        return self::difference($date, self::now())->y;
    }
    public static function isPast(string|int $date): bool
    {
        return self::parse(self::format($date)) < time();
    }
    public static function isFuture(string|int $date): bool
    {
        return self::parse(self::format($date)) > time();
    }
    public static function isToday(string|int $date): bool
    {
        return self::format($date, 'Y-m-d') === self::today();
    }
    public static function isWeekend(string|int $date): bool
    {
        return in_array(self::format($date, 'N'), [6, 7], true);
    }
    public static function isLeapYear(?int $year = null): bool
    {
        $year ??= (int) date('Y');
        return checkdate(2, 29, $year);
    }
    public static function daysInMonth(?int $month = null, ?int $year = null): int
    {
        $month ??= (int) date('m');
        $year ??= (int) date('Y');
        return cal_days_in_month(CAL_GREGORIAN, $month, $year);
    }
    public static function monthName(?int $month = null): string
    {
        $month ??= (int) date('m');
        return date('F', mktime(0, 0, 0, $month, 1));
    }
    public static function dayName(string|int|null $date = null): string
    {
        $date ??= time();
        return self::format($date, 'l');
    }
}