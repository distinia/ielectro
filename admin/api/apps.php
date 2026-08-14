<?php
namespace Admin;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
class Apps
{
    public function index(): void
    {
        Routing::method([
            'GET' => fn() => $this->list(),
        ]);
    }

    public static function catalog(): array
    {
        return [
            [
                'name' => 'Dyscover',
                'description' => 'A modern reading and publishing platform for articles, stories, and knowledge sharing.',
                'icon' => 'book',
                'logo' => 'https://www.ielectro.com/assets/brand/logo.png',
                'url' => 'https://dyscover.ielectro.com',
                'images' => [
                    'https://www.ielectro.com/assets/dyscover-app/hero.png',
                    'https://www.ielectro.com/assets/dyscover-app/editor.png',
                    'https://www.ielectro.com/assets/dyscover-app/library.png',
                    'https://www.ielectro.com/assets/dyscover-app/collab.png',
                ],
            ],
        ];
    }

    private function list(): void
    {
        Request::get();
        Response::success(self::catalog());
    }
}
