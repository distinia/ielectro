<?php
namespace Dyscover;
use Nesh\File;
use Nesh\Response;
class Media
{
    private static $types = ['image', 'video', 'audio', 'document'];
    private static function path($userId, $type)
    {
        return '../../u/'.$userId.'/'.$type.'/';
    }
    private static function checkType($type)
    {
        if (!in_array($type, self::$types, true)) {
            Response::badRequest('Invalid media type');
        }
    }
    public static function create(mixed $arg1, mixed $arg2, mixed $arg3, mixed $arg4) {
        self::checkType($type);
        if (!isset($media['tmp_name']) || !is_uploaded_file($media['tmp_name'])) {
            Response::badRequest('Invalid file');
        }
        $path = self::path($userId, $type);
        if (!is_dir($path) && !mkdir($path, 0755, true)) {
            Response::error('Directory error');
        }
        if (!move_uploaded_file($media['tmp_name'], $path.$file)) {
            Response::error('Upload failed');
        }
    }
    public static function update(mixed $arg1, mixed $arg2, mixed $arg3, mixed $arg4, mixed $arg5) {
        self::checkType($type);
        $path = self::path($userId, $type);
        $oldPath = $path.$oldFile;
        $newPath = $path.$newFile;
        if ($oldFile !== $newFile) {
            if (!file_exists($oldPath)) {
                Response::notFound('File not found');
            }
            if (!rename($oldPath, $newPath)) {
                Response::error('Rename failed');
            }
            self::renameInArticles(
                'user/'.$userId.'/'.$type.'/'.$oldFile,
                'user/'.$userId.'/'.$type.'/'.$newFile
            );
        }
        if ($media && isset($media['tmp_name']) && is_uploaded_file($media['tmp_name'])) {
            if (file_exists($newPath)) {
                unlink($newPath);
            }
            if (!move_uploaded_file($media['tmp_name'], $newPath)) {
                Response::error('Upload failed');
            }
        }
    }
    public static function delete(mixed $arg1, mixed $arg2, mixed $arg3) {
        self::checkType($type);
        $path = self::path($userId, $type).$file;
        if (file_exists($path)) {
            unlink($path);
        }
        self::removeInArticles(
            'user/'.$userId.'/'.$type.'/'.$file
        );
    }
    public static function name(mixed $arg1) {
        $extension = strtolower(
            pathinfo($media['name'], PATHINFO_EXTENSION)
        );
        return bin2hex(random_bytes(16)).'.'.$extension;
    }
    public static function renameInArticles(mixed $arg1, mixed $arg2) {
        foreach (glob('../../u/*/article/*.html') as $file) {
            $content = file_get_contents($file);
            $updated = str_replace(
                APP_URL.'/'.$old,
                APP_URL.'/'.$new,
                $content
            );
            if ($updated !== $content) {
                file_put_contents($file, $updated);
            }
        }
    }
    public static function removeInArticles(mixed $arg1) {
        $url = APP_URL.'/'.$path;
        foreach (glob('../../u/*/article/*.html') as $file) {
            $html = file_get_contents($file);
            libxml_use_internal_errors(true);
            $dom = new DOMDocument();
            $dom->loadHTML(
                $html,
                LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
            );
            libxml_clear_errors();
            $xpath = new DOMXPath($dom);
            foreach ($xpath->query('//img[contains(@src,"'.$url.'")] | //video[contains(@src,"'.$url.'")] | //audio[contains(@src,"'.$url.'")]') as $node) {
                $node->parentNode->removeChild($node);
            }
            $updated = $dom->saveHTML();
            if ($updated !== $html) {
                file_put_contents($file, $updated);
            }
        }
    }
}
