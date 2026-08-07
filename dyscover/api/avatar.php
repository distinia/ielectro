<?php
namespace Dyscover;
use Nesh\File;
use Nesh\Image;
use Nesh\Query;
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
        if (is_file($target)) {
            unlink($target);
        }
        $image = Image::upload(
            $file,
            pathinfo(self::FILENAME, PATHINFO_FILENAME),
            true
        );
        $image->resize(512, 512)->save($dir);
        if ($image->path() !== $target && is_file($image->path())) {
            if (is_file($target)) {
                unlink($target);
            }
            rename($image->path(), $target);
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
