<?php
namespace Dyscover;
use Nesh\Request;
use Nesh\Response;
class Tags
{
    public function index(): void
    {
        Request::get();
        $term = ltrim(trim((string) Request::value('term', '')), '#');
        if ($term === '') {
            Response::success([]);
            return;
        }
        Response::success(PostTags::suggest($term));
    }
}
