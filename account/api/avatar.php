<?php
namespace Account;

use Nesh\File;
use Nesh\Generate;
use Nesh\Identity;
use Nesh\Image;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
use Nesh\Avatar as AccountAvatar;

class Avatar
{
    public function index(): void
    {
        Routing::method([
            'POST'   => fn() => $this->update(),
            'PUT'    => fn() => $this->update(),
            'PATCH'  => fn() => $this->update(),
            'DELETE' => fn() => $this->destroy(),
        ]);
    }

    public static function url(int $accountId): string
    {
        return AccountAvatar::url($accountId);
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

        $accountId = Identity::id();
        $file = Request::file('avatar') ?? Request::file('file');
        if (!$file) {
            Response::badRequest('Missing avatar file');
        }

        $dir = AccountAvatar::assetsDir($accountId);
        File::makeDirectory($dir);
        AccountAvatar::purgeStale($dir);

        $target = AccountAvatar::path($accountId);
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

        Response::success([
            'url' => self::url($accountId),
            'avatar_custom' => AccountAvatar::isCustom($accountId),
        ]);
    }

    private function destroy(): void
    {
        Request::delete();
        $accountId = Identity::id();
        AccountAvatar::reset($accountId);
        Response::success([
            'url' => self::url($accountId),
            'avatar_custom' => AccountAvatar::isCustom($accountId),
        ]);
    }
}
