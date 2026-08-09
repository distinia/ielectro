<?php
namespace Dyscover;
use Nesh\File;
use Nesh\Generate;
use Nesh\Image;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
class Avatar
{
    private const FILENAME = 'avatar.png';
    public function index(): void
    {
        Routing::method([
            'POST'   => fn() => $this->update(),
            'PUT'    => fn() => $this->update(),
            'PATCH'  => fn() => $this->update(),
            'DELETE' => fn() => $this->destroy(),
        ]);
    }
    public static function url(int $userId): string
    {
        return \APP_URL . '/assets/users/' . $userId . '/' . self::FILENAME;
    }
    public static function provision(int $userId): void
    {
        if ($userId <= 0) {
            return;
        }
        $dir = \APP_ASSETS . '/users/' . $userId;
        $target = $dir . '/' . self::FILENAME;
        if (is_file($target)) {
            return;
        }
        $defaultDir = \APP_ASSETS . '/default-user';
        if (!is_dir($defaultDir)) {
            File::makeDirectory($dir);
            return;
        }
        File::copyDirectory($defaultDir, $dir, true);
    }
    private function update(): void
    {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'POST'));
        if ($method === 'PUT') {
            Request::put();
        } elseif ($method === 'PATCH') {
            Request::patch();
        } else {
            Request::post();
        }
        $userId = User::id();
        $file = Request::file('avatar') ?? Request::file('file');
        if (!$file) {
            Response::badRequest('Missing avatar file');
        }
        $dir = \APP_ASSETS . '/users/' . $userId;
        File::makeDirectory($dir);
        self::purgeStaleAvatars($dir);
        $target = $dir . '/' . self::FILENAME;
        $image = Image::upload($file, Generate::token(), true);
        $image->cover(512, 512);
        if ($image->extension() !== 'png') {
            $image->convert('png');
        }
        $image->save($dir);
        $savedPath = $image->path();
        if ($savedPath !== $target) {
            if (!File::movePath($savedPath, $target, true)) {
                if (is_file($savedPath)) {
                    unlink($savedPath);
                }
                Response::error('Unable to save avatar');
            }
        }
        if (!is_file($target)) {
            Response::error('Unable to save avatar');
        }
        Response::success(['url' => self::url($userId)]);
    }
    private static function purgeStaleAvatars(string $dir): void
    {
        foreach (glob($dir . '/avatar*') ?: [] as $path) {
            if (!is_file($path)) {
                continue;
            }
            if (basename($path) === self::FILENAME) {
                continue;
            }
            unlink($path);
        }
    }
    private function destroy(): void
    {
        Request::delete();
        $userId = User::id();
        $target = \APP_ASSETS . '/users/' . $userId . '/' . self::FILENAME;
        $default = \APP_ASSETS . '/default-user/' . self::FILENAME;
        File::makeDirectory(\APP_ASSETS . '/users/' . $userId);
        if (!is_file($default)) {
            if (is_file($target)) {
                unlink($target);
            }
            Response::success(['url' => self::url($userId)]);
        }
        copy($default, $target);
        Response::success(['url' => self::url($userId)]);
    }
}
