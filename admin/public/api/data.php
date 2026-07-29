<?php
namespace Admin;
use Nesh\Query;
class Data
{
    public static function projectRoot() {
        //return ABOUT_PATH;
    }
    public static function clean(mixed $arg1) {
        return trim(strip_tags((string) $value));
    }
    public static function filenameOnly(mixed $arg1) {
        $value = trim((string) $value);
        if ($value === '') {
            return '';
        }
        if (preg_match('#^https?://#i', $value)) {
            $value = parse_url($value, PHP_URL_PATH) ?: $value;
        }
        return basename(str_replace('\\', '/', $value));
    }
    public static function randomCode() {
        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $code = '';
        for ($i = 0; $i < 16; $i++) {
            $code .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $code;
    }
    public static function ensureNewsCodes() {
        $rows = Query::fetchAll("SELECT id FROM news WHERE code IS NULL OR code = ''");
        foreach ($rows as $row) {
            do {
                $code = self::randomCode();
            } while (Query::count("SELECT COUNT(*) FROM news WHERE code = ?", [$code]) > 0);
            Query::execute("UPDATE news SET code = ? WHERE id = ?", [$code, (int) $row['id']]);
        }
    }
    public static function teamAvatarPublicUrl(mixed $arg1) {
        $filename = self::filenameOnly($filename);
        if ($filename === '') {
            return '';
        }
        return APP_URL.'/content/team/'.rawurlencode($filename);
    }
    public static function newsImagePublicUrl(mixed $arg1) {
        $filename = self::filenameOnly($filename);
        if ($filename === '') {
            return '';
        }
        if (preg_match('#^https?://#i', (string) $filename)) {
            return (string) $filename;
        }
        return APP_URL.'/content/news/'.rawurlencode($filename);
    }
}
