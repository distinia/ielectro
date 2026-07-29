<?php
namespace Admin;
use Nesh\Response;
class Media
{
    private static function allowedImageExtensions()
    {
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'];
    }
    public static function imageExt(mixed $arg1) {
        $ext = strtolower(pathinfo((string) $filename, PATHINFO_EXTENSION));
        if (!in_array($ext, self::allowedImageExtensions(), true)) {
            Response::badRequest('Unsupported image type');
        }
        return $ext;
    }
    public static function assertUploadedImage(mixed $arg1) {
        if (!is_file($tmpName)) {
            Response::badRequest('Invalid upload');
        }
        $info = @getimagesize($tmpName);
        if ($info === false) {
            Response::badRequest('Invalid image file');
        }
    }
    public static function mediaDir(mixed $arg1) {
        $type = trim((string) $type);
        $dir = Data::projectRoot().'/content/'.$type;
        if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
            Response::error('Unable to create media directory');
        }
        return $dir;
    }
    public static function unlinkGlob(mixed $arg1) {
        foreach (glob($pattern) ?: [] as $file) {
            @unlink($file);
        }
    }
}
