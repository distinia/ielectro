<?php

namespace Www;

use Nesh\Query;
use Nesh\RateLimit;
use Nesh\Request;
use Nesh\Response;
use Nesh\Routing;
use Nesh\Schema;

class Views
{
    public function index(): void
    {
        Routing::method([
            'POST' => fn() => $this->track(),
        ]);
    }

    public function track(): void
    {
        Request::post();
        RateLimit::check('www:page-view', 120, 60);

        $path = self::normalizePath((string) Request::value('path', '/'));

        Query::execute(
            'INSERT INTO ' . Schema::ADMIN_WWW_PAGE_VIEWS . ' (path) VALUES (?)',
            [$path]
        );

        Response::created('View recorded');
    }

    private static function normalizePath(string $path): string
    {
        $path = trim($path);
        if ($path === '') {
            return '/';
        }
        if ($path[0] !== '/') {
            $path = '/' . $path;
        }
        $path = preg_replace('#/+#', '/', $path) ?: '/';
        if (strlen($path) > 255) {
            $path = substr($path, 0, 255);
        }

        return $path;
    }
}
