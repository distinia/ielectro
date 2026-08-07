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
            'PUT'    => fn() => $this->update(),
            'DELETE' => fn() => $this->destroy(),
        ]);
    }
    public static function url(int $userId): string
    {
        return APP_URL . '/assets/users/' . $userId . '/' . self::FILENAME;
    }
    private function update(): void
    {
        Request::put();
        $userId = User::id();
        $file = Request::file('avatar') ?? Request::file('file');
        if (!$file) {
            Response::badRequest('Missing avatar file');
        }
        File::makeDirectory(APP_ASSETS . '/users/' . $userId);
        $image = Image::upload($file, self::FILENAME, true);
        $image->resize(512, 512)->save(APP_ASSETS . '/users/' . $userId);
        Response::success(['url' => self::url($userId)]);
    }
    private function destroy(): void
    {
        Request::delete();
        $userId = User::id();
        $target = APP_ASSETS . '/users/' . $userId . '/' . self::FILENAME;
        $default = APP_ASSETS . '/default-user/' . self::FILENAME;
        File::makeDirectory(APP_ASSETS . '/users/' . $userId);
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
