<?php



namespace Dyscover;



use Nesh\Ai\Client;

use Nesh\Query;



require_once __DIR__ . '/posts.php';



class PostTagEnricher

{

    public static function normalizeAll(): array

    {

        $rows = Query::fetchAll(

            "SELECT p.id, p.type, p.title, p.description

            FROM ielectro_dyscover.dyscover_posts p

            WHERE p.status = 'active'

            ORDER BY p.id ASC"

        );



        $updated = 0;

        foreach ($rows as $row) {

            $postId = (int) ($row['id'] ?? 0);

            if ($postId <= 0) {

                continue;

            }



            $before = PostTags::names($postId);

            $candidates = array_values(array_unique(array_merge($before, self::ruleTags($row))));

            $ranked = PostTags::rank($candidates, $row);

            if ($ranked === $before) {

                continue;

            }



            PostTags::sync($postId, $ranked, $row);

            $updated++;

        }



        $pruned = PostTags::pruneUnused();



        return [

            'updated' => $updated,

            'pruned' => $pruned,

        ];

    }



    public static function enrichAll(bool $useLlm = true): array

    {

        $rows = Query::fetchAll(

            "SELECT p.id, p.type, p.title, p.description

            FROM ielectro_dyscover.dyscover_posts p

            WHERE p.status = 'active'

            ORDER BY p.id ASC"

        );



        $updated = 0;

        foreach ($rows as $row) {

            $postId = (int) ($row['id'] ?? 0);

            if ($postId <= 0) {

                continue;

            }



            $before = PostTags::names($postId);

            $tags = self::suggestTags($row, $useLlm);

            if ($tags === []) {

                continue;

            }



            PostTags::sync($postId, $tags, $row);

            $after = PostTags::names($postId);

            if ($after !== $before) {

                $updated++;

            }



            if ($useLlm) {

                Client::pause();

            }

        }



        $pruned = PostTags::pruneUnused();



        return [

            'updated' => $updated,

            'pruned' => $pruned,

        ];

    }



    public static function suggestTags(array $post, bool $useLlm = true): array

    {

        $tags = self::ruleTags($post);

        if ($useLlm) {

            $tags = array_merge($tags, self::llmTags($post));

        }



        $existing = PostTags::names((int) ($post['id'] ?? 0));

        $candidates = array_values(array_unique(array_merge($existing, PostTags::parse($tags))));



        return PostTags::rank($candidates, $post);

    }



    private static function ruleTags(array $post): array

    {

        $title = mb_strtolower(trim((string) ($post['title'] ?? '')));

        $description = mb_strtolower(trim((string) ($post['description'] ?? '')));

        $type = (string) ($post['type'] ?? '');

        $text = $title . ' ' . $description;

        $tags = [];



        foreach ([

            'destenia', 'destenian', 'fesia', 'edrobea', 'edrobean', 'agaritia', 'kashiria', 'lamberia',

            'jarnovia', 'comussania', 'cusea', 'ricene', 'valmirica', 'verdania', 'boravia', 'alveria',

        ] as $place) {

            if (str_contains($text, $place)) {

                $tags[] = $place === 'destenian' ? 'destenia' : $place;

            }

        }



        if (str_contains($text, 'revolutionaries') || str_contains($text, 'rvlz')) {

            $tags = array_merge($tags, [

                'politicalparty',

                'politics',

                'massorganization',

                'revolutionaries',

                'destenia',

            ]);

        }



        if (str_contains($text, 'political party') || $title === 'political party') {

            $tags = array_merge($tags, ['politicalparty', 'politics', 'party']);

        }



        if (str_contains($text, 'president')) {

            $tags = array_merge($tags, ['president', 'politics', 'office', 'statesman']);

        }



        if (str_contains($text, 'prime minister') || str_contains($text, 'premier')) {

            $tags = array_merge($tags, ['primeminister', 'politics', 'government', 'cabinet']);

        }



        if (str_contains($text, 'minister of')) {

            $tags = array_merge($tags, ['minister', 'politics', 'government', 'cabinet']);

        }



        if (str_contains($text, 'politics of') || str_contains($text, 'government of')) {

            $tags = array_merge($tags, ['politics', 'government']);

        }



        if (str_contains($text, 'organizations in')) {

            $tags = array_merge($tags, ['organizations', 'politics', 'destenia']);

        }



        if (str_contains($text, 'armed forces') || str_contains($text, ' military') || str_contains($text, 'army')) {

            $tags = array_merge($tags, ['military', 'armedforces']);

        }



        if (str_contains($text, 'law enforcement') || str_contains($text, 'police')) {

            $tags = array_merge($tags, ['lawenforcement', 'police']);

        }



        if (str_contains($text, 'flag of')) {

            $tags = array_merge($tags, ['flag', 'symbol']);

        }



        if (str_contains($text, 'emblem of')) {

            $tags = array_merge($tags, ['emblem', 'symbol']);

        }



        if (str_contains($text, 'map of')) {

            $tags[] = 'map';

        }



        if (str_contains($text, 'anthem of') || str_contains($text, 'anthem')) {

            $tags = array_merge($tags, ['anthem', 'symbol']);

        }



        if ($type === 'image') {

            $tags[] = 'image';

            if (str_contains($text, 'portrait') || str_contains($text, 'president of')) {

                $tags[] = 'portrait';

            }

        }



        if ($type === 'video') {

            $tags[] = 'video';

        }



        if ($type === 'audio') {

            $tags[] = 'audio';

        }



        if ($type === 'document') {

            $tags[] = 'document';

        }



        if ($type === 'template') {

            $tags[] = 'template';

        }



        $countryTitles = [

            'destenia', 'fesia', 'agaritia', 'kashiria', 'lamberia', 'jarnovia', 'comussania',

            'cusea', 'ricene', 'valmirica', 'verdania', 'boravia', 'alveria', 'metosia', 'stasia', 'suklan',

        ];

        if ($type === 'article' && in_array($title, $countryTitles, true)) {

            $tags = array_merge($tags, ['politics', 'government', 'geography']);

        }



        foreach (preg_split('/\s+/u', $title) ?: [] as $word) {

            $word = preg_replace('/[^a-z0-9]+/i', '', $word) ?? '';

            if ($word !== '' && strlen($word) >= 4 && strlen($word) <= 14) {

                $tags[] = $word;

            }

        }



        return $tags;

    }



    private static function llmTags(array $post): array

    {

        try {

            $raw = Client::chat([

                [

                    'role' => 'system',

                    'content' => 'Suggest relevant Dyscover post tags. Reply ONLY JSON array of lowercase tags, max 5. '

                        . 'Prefer topic, entity, organization type. Avoid generic tags like creative, lore, worldbuilding. '

                        . 'Example: ["politicalparty","destenia","politics","massorganization","revolutionaries"]',

                ],

                [

                    'role' => 'user',

                    'content' => 'Type: ' . ($post['type'] ?? '') . "\nTitle: " . ($post['title'] ?? '')

                        . "\nDescription: " . ($post['description'] ?? ''),

                ],

            ], 0.1, 120, Client::fastModel());



            if (preg_match('/\[[\s\S]*\]/', $raw, $match)) {

                $json = json_decode($match[0], true);

                if (is_array($json)) {

                    return PostTags::parse($json);

                }

            }

        } catch (\Throwable) {

            // ignore per-post LLM failures

        }



        return [];

    }

}


