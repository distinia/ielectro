<?php
namespace Dyscover;
use Nesh\Ai\Client;
use Nesh\Query;
require_once __DIR__ . '/posts.php';
require_once __DIR__ . '/article-content.php';
class ArticleKnowledge
{
    private const STOP_WORDS = [
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one',
        'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now',
        'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'let', 'put', 'say', 'she', 'too',
        'use', 'that', 'this', 'with', 'from', 'they', 'have', 'been', 'will', 'your', 'what',
        'when', 'where', 'which', 'their', 'there', 'about', 'into', 'than', 'them', 'then',
        'these', 'those', 'would', 'could', 'should', 'being', 'also', 'only', 'other', 'some',
        'such', 'more', 'most', 'very', 'just', 'like', 'over', 'after', 'before', 'between',
        'under', 'again', 'once', 'here', 'che', 'per', 'con', 'una', 'uno', 'degli', 'delle',
        'dello', 'della', 'sono', 'come', 'anche', 'questo', 'questa', 'quello', 'quella',
    ];
    private const COUNTRY_FIELD_HINTS = [
        'population', 'area', 'gdp', 'currency', 'demonym', 'capital', 'ethnic', 'language',
        'languages', 'map', 'flag', 'emblem', 'anthem', 'motto', 'border', 'continent',
        'preceded', 'religion', 'government', 'legislature',
    ];
    private const OFFICE_FIELD_HINTS = [
        'leadership', 'mandate', 'term', 'president', 'minister', 'speaker', 'incumbent',
        'role', 'office', 'premier', 'justice', 'formation', 'predecessor', 'successor',
        'appointment', 'election', 'powers', 'residence',
    ];
    public static function expandSearchTerms(array $terms, string $primaryEntity, string $archetype): array
    {
        $expanded = $terms;
        $entity = mb_strtolower(trim($primaryEntity));
        if ($entity !== '') {
            $expanded[] = $entity;
            $expanded[] = 'politics of ' . $entity;
            $expanded[] = $entity . ' armed forces';
            $expanded[] = 'law enforcement in ' . $entity;
            $expanded[] = 'organizations in ' . $entity;
        }
        if (in_array($archetype, ['president', 'office', 'other'], true) && $entity !== '') {
            $expanded[] = 'politics';
            $expanded[] = 'government';
            $expanded[] = 'armed forces';
            $expanded[] = 'military';
            if ($entity === 'destenia' || str_contains($entity, 'desten')) {
                $expanded[] = 'political party';
                $expanded[] = 'party';
                $expanded[] = 'revolutionaries';
                $expanded[] = 'mass organization';
            }
        }
        if ($archetype === 'country' && $entity !== '') {
            $expanded[] = 'geography';
            $expanded[] = 'economy';
            $expanded[] = 'demography';
            $expanded[] = 'culture';
        }
        return array_values(array_unique(array_filter(array_map(
            static fn($term): string => mb_strtolower(trim((string) $term)),
            $expanded
        ))));
    }
    public static function searchRelatedArticles(
        array $terms,
        string $primaryEntity,
        string $archetype,
        ?string $excludeUuid,
        int $limit = 14,
        array $relatedTags = []
    ): array {
        $expanded = self::expandSearchTerms($terms, $primaryEntity, $archetype);
        $results = self::searchByTerms($expanded, $primaryEntity, $excludeUuid, ['article'], $limit * 2, false);
        $tagResults = self::searchPostsByTags($relatedTags, $excludeUuid, ['article'], $limit);
        $deduped = [];
        foreach (array_merge($tagResults, $results) as $row) {
            $uuid = (string) ($row['uuid'] ?? '');
            if ($uuid !== '') {
                $deduped[$uuid] = $row;
            }
        }
        $ranked = array_values($deduped);
        usort(
            $ranked,
            static fn(array $a, array $b): int => ($b['topic_score'] ?? 0) <=> ($a['topic_score'] ?? 0)
        );
        return array_slice($ranked, 0, $limit);
    }
    public static function postsByIds(array $ids, ?string $excludeUuid = null, int $limit = 12): array
    {
        $ids = array_values(array_unique(array_filter(
            array_map(static fn($id): int => (int) $id, $ids),
            static fn(int $id): bool => $id > 0
        )));
        if ($ids === []) {
            return [];
        }
        $ids = array_slice($ids, 0, $limit);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $params = $ids;
        $sql = "SELECT p.id, p.uuid, p.type, p.title, p.description, p.user_id, p.extension
            FROM ielectro_dyscover.dyscover_posts p
            WHERE p.id IN ({$placeholders})
            AND p.type IN ('article', 'image', 'video', 'audio', 'document')
            AND p.status = 'active'";
        if ($excludeUuid !== null && $excludeUuid !== '') {
            $sql .= ' AND p.uuid <> ?';
            $params[] = $excludeUuid;
        }
        $rows = Query::fetchAll($sql, $params);
        $byId = [];
        foreach ($rows as $row) {
            $uuid = (string) ($row['uuid'] ?? '');
            $userId = (int) ($row['user_id'] ?? 0);
            $type = (string) ($row['type'] ?? '');
            $url = $type === 'article' || $type === 'document'
                ? ($type === 'document'
                    ? rtrim((string) APP_URL, '/') . '/document/' . rawurlencode($uuid)
                    : self::articleUrl($uuid))
                : '';
            $byId[(int) $row['id']] = [
                'id' => (int) $row['id'],
                'uuid' => $uuid,
                'type' => $type,
                'title' => (string) ($row['title'] ?? ''),
                'description' => (string) ($row['description'] ?? ''),
                'url' => $url,
                'media_url' => self::postMediaUrl($row),
                'user_id' => $userId,
                'extension' => (string) ($row['extension'] ?? ''),
            ];
        }
        $ordered = [];
        foreach ($ids as $id) {
            if (isset($byId[$id])) {
                $ordered[] = $byId[$id];
            }
        }
        return $ordered;
    }
    public static function loadAttachedKnowledge(array $posts, string $query, int $maxChars = 12000): array
    {
        $chunks = [];
        $links = [];
        $media = [];
        $used = 0;
        $seenLinks = [];
        $seenMedia = [];
        foreach ($posts as $post) {
            $type = (string) ($post['type'] ?? '');
            $title = (string) ($post['title'] ?? 'Untitled');
            if ($type === 'article') {
                $userId = (int) ($post['user_id'] ?? 0);
                $uuid = (string) ($post['uuid'] ?? '');
                $path = $uuid !== '' && $userId > 0 ? PostAssets::articlePath($userId, $uuid) : '';
                $html = $path !== '' && is_file($path) ? (string) file_get_contents($path) : '';
                $extracted = $html !== ''
                    ? ArticleContent::extractKnowledge($html, $query, 3800)
                    : ['text' => '', 'links' => [], 'images' => [], 'tables' => []];
                $block = '[' . $title . " — article HTML]\n";
                if ($extracted['text'] !== '') {
                    $block .= $extracted['text'] . "\n";
                }
                foreach ($extracted['tables'] as $table) {
                    $block .= "Table:\n" . $table . "\n";
                }
                $len = mb_strlen($block);
                if ($used + $len <= $maxChars) {
                    $chunks[] = trim($block);
                    $used += $len;
                }
                if (!empty($post['url'])) {
                    $links[] = [
                        'title' => $title,
                        'url' => (string) $post['url'],
                    ];
                    $seenLinks[mb_strtolower((string) $post['url'])] = true;
                }
                foreach ($extracted['links'] as $link) {
                    $url = (string) ($link['url'] ?? '');
                    $key = mb_strtolower($url);
                    if ($url === '' || isset($seenLinks[$key])) {
                        continue;
                    }
                    $seenLinks[$key] = true;
                    $links[] = $link;
                }
                foreach ($extracted['images'] as $image) {
                    $src = (string) ($image['src'] ?? '');
                    $key = mb_strtolower($src);
                    if ($src === '' || isset($seenMedia[$key])) {
                        continue;
                    }
                    $seenMedia[$key] = true;
                    $media[] = [
                        'title' => (string) ($image['alt'] ?? $title),
                        'type' => 'image',
                        'media_url' => $src,
                    ];
                }
                continue;
            }
            $desc = trim((string) ($post['description'] ?? ''));
            $mediaUrl = (string) ($post['media_url'] ?? '');
            $line = '[' . $type . '] ' . $title;
            if ($desc !== '') {
                $line .= ' — ' . mb_substr($desc, 0, 280);
            }
            if ($mediaUrl !== '') {
                $line .= "\nURL: " . $mediaUrl;
                $key = mb_strtolower($mediaUrl);
                if (!isset($seenMedia[$key])) {
                    $seenMedia[$key] = true;
                    $media[] = [
                        'title' => $title,
                        'type' => $type,
                        'media_url' => $mediaUrl,
                    ];
                }
            }
            if (!empty($post['url'])) {
                $url = (string) $post['url'];
                $key = mb_strtolower($url);
                if (!isset($seenLinks[$key])) {
                    $seenLinks[$key] = true;
                    $links[] = [
                        'title' => $title,
                        'url' => $url,
                    ];
                }
            }
            $len = mb_strlen($line);
            if ($used + $len <= $maxChars) {
                $chunks[] = $line;
                $used += $len;
            }
        }
        return [
            'corpus' => implode("\n\n", $chunks),
            'links' => $links,
            'media' => $media,
        ];
    }
    public static function searchPostsByTags(
        array $tagNames,
        ?string $excludeUuid,
        array $types,
        int $limit
    ): array {
        $tagNames = array_values(array_unique(array_filter(array_map(
            static fn($tag): string => mb_strtolower(trim((string) $tag)),
            $tagNames
        ))));
        if ($tagNames === []) {
            return [];
        }
        $typeList = implode(',', array_map(
            static fn(string $type): string => "'" . str_replace("'", "''", $type) . "'",
            $types
        ));
        $scoreParts = [];
        $whereParts = [];
        $params = [];
        foreach ($tagNames as $tag) {
            $like = '%' . $tag . '%';
            $scoreParts[] = '(CASE WHEN LOWER(t.name) LIKE ? THEN 6 ELSE 0 END)';
            $whereParts[] = 'LOWER(t.name) LIKE ?';
            $params[] = $like;
            $params[] = $like;
        }
        $sql = 'SELECT p.id, p.uuid, p.type, p.title, p.description, p.user_id, p.extension,
            (' . implode(' + ', $scoreParts) . ') AS relevance
            FROM ielectro_dyscover.dyscover_posts p
            INNER JOIN ielectro_dyscover.dyscover_post_tags pt ON pt.post_id = p.id
            INNER JOIN ielectro_dyscover.dyscover_tags t ON t.id = pt.tag_id
            WHERE p.status = \'active\'
            AND p.type IN (' . $typeList . ')
            AND (' . implode(' OR ', $whereParts) . ')';
        if ($excludeUuid !== null && $excludeUuid !== '') {
            $sql .= ' AND p.uuid <> ?';
            $params[] = $excludeUuid;
        }
        $sql .= ' GROUP BY p.id ORDER BY relevance DESC, p.updated_at DESC LIMIT ' . (int) $limit;
        $rows = Query::fetchAll($sql, $params);
        $postIds = array_map(static fn(array $row): int => (int) ($row['id'] ?? 0), $rows);
        $tagMap = PostTags::mapForPosts($postIds);
        $results = [];
        foreach ($rows as $row) {
            $uuid = (string) $row['uuid'];
            $userId = (int) $row['user_id'];
            $type = (string) $row['type'];
            $url = $type === 'article' ? self::articleUrl($uuid) : '';
            $mediaUrl = self::postMediaUrl($row);
            $snippet = trim((string) ($row['description'] ?? ''));
            $entry = [
                'id' => (int) $row['id'],
                'uuid' => $uuid,
                'type' => $type,
                'title' => (string) ($row['title'] ?? ''),
                'url' => $url,
                'media_url' => $mediaUrl,
                'snippet' => mb_substr($snippet, 0, 220),
                'user_id' => $userId,
                'tags' => $tagMap[(int) $row['id']] ?? [],
                'topic_score' => (int) ($row['relevance'] ?? 0) + 8,
            ];
            $results[] = $entry;
        }
        return $results;
    }
    public static function searchBodyMedia(
        array $terms,
        string $primaryEntity,
        string $archetype,
        ?string $excludeUuid,
        int $limit = 24
    ): array {
        $expanded = self::expandSearchTerms($terms, $primaryEntity, $archetype);
        $results = self::searchByTerms($expanded, $primaryEntity, $excludeUuid, ['image', 'video', 'audio'], $limit * 2, true);
        $filtered = [];
        foreach ($results as $row) {
            if ((int) ($row['topic_score'] ?? 0) >= 4) {
                $filtered[] = $row;
            }
        }
        return array_slice($filtered, 0, $limit);
    }
    public static function pickMediaPairForField(
        array $media,
        array $field,
        array $terms,
        string $primaryEntity,
        string $articleTitle = ''
    ): ?array {
        $name = mb_strtolower((string) ($field['name'] ?? '') . ' ' . (string) ($field['slug'] ?? ''));
        if (($field['type'] ?? '') !== 'double-image' && !str_contains($name, 'flag') && !str_contains($name, 'emblem')) {
            return null;
        }
        $matches = [];
        foreach ($media as $item) {
            if (($item['type'] ?? '') !== 'image' || empty($item['media_url'])) {
                continue;
            }
            $score = (int) ($item['topic_score'] ?? self::scorePostForTopic($item, $terms, $primaryEntity, true));
            if ($score >= 4) {
                $matches[] = $item;
            }
        }
        if (count($matches) < 2) {
            return count($matches) === 1 ? $matches : null;
        }
        return array_slice($matches, 0, 2);
    }
    public static function formatMediaCatalogGrouped(array $media, int $limit = 18): string
    {
        if ($media === []) {
            return 'No verified media posts available. Omit media macros if none fit the section topic.';
        }
        $lines = ['Use verified media generously after headings when the title matches the article topic:'];
        foreach (array_slice($media, 0, $limit) as $item) {
            $lines[] = '- [' . ($item['type'] ?? 'media') . '] ' . ($item['title'] ?? '')
                . ' → {{image|' . ($item['media_url'] ?? '') . '|caption}}';
        }
        return implode("\n", $lines);
    }
    public static function retrieve(string $prompt, ?string $excludeUuid = null, int $limit = 6): array
    {
        return self::searchPosts($prompt, '', $excludeUuid, ['article', 'document'], $limit, false);
    }
    public static function linkCatalog(
        string $prompt,
        string $title,
        ?string $excludeUuid = null,
        int $limit = 24
    ): array {
        return self::searchPosts($prompt, $title, $excludeUuid, ['article'], $limit, true);
    }
    public static function mediaCatalog(string $prompt, string $title, int $limit = 18): array
    {
        return self::searchPosts($prompt, $title, null, ['image', 'video', 'audio'], $limit, true);
    }
    public static function rankedTemplates(string $prompt, string $title, int $limit = 8): array
    {
        $catalog = self::templateCatalog(60);
        $topic = mb_strtolower(trim($prompt . ' ' . $title));
        $isOfficeTopic = (bool) preg_match(
            '/president|prime minister|minister|head of state|office holder|official|speaker|bureaucrat|magistrate|prosecutor|chief justice/i',
            $topic
        );
        $isCountryTopic = (bool) preg_match(
            '/\b(country|republic|nation|kingdom|territory|state of)\b/i',
            $topic
        ) && !$isOfficeTopic;
        foreach ($catalog as $index => $template) {
            $catalog[$index]['score'] = self::scoreTemplate(
                $template,
                $topic,
                $isOfficeTopic,
                $isCountryTopic
            );
        }
        usort(
            $catalog,
            static fn(array $a, array $b): int => ($b['score'] ?? 0) <=> ($a['score'] ?? 0)
        );
        $filtered = array_values(array_filter(
            $catalog,
            static fn(array $template): bool => (int) ($template['score'] ?? 0) >= 8
        ));
        return array_slice($filtered, 0, $limit);
    }
    public static function templateById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $row = Query::fetch(
            "SELECT p.id, p.title, p.description
            FROM ielectro_dyscover.dyscover_posts p
            WHERE p.id = ?
            AND p.type = 'template'
            AND p.status = 'active'
            LIMIT 1",
            [$id]
        );
        if (!$row) {
            return null;
        }
        $fields = Query::fetchAll(
            'SELECT name, type, position
            FROM ielectro_dyscover.dyscover_template_fields
            WHERE template_id = ?
            ORDER BY position ASC',
            [$id]
        );
        return [
            'id' => (int) $row['id'],
            'title' => (string) ($row['title'] ?? ''),
            'description' => (string) ($row['description'] ?? ''),
            'fields' => array_map(
                static fn(array $field): array => [
                    'name' => (string) ($field['name'] ?? ''),
                    'type' => (string) ($field['type'] ?? 'text'),
                    'slug' => self::fieldSlug((string) ($field['name'] ?? '')),
                ],
                $fields
            ),
        ];
    }
    public static function templateCatalog(int $limit = 20): array
    {
        $rows = Query::fetchAll(
            "SELECT p.id, p.title, p.description
            FROM ielectro_dyscover.dyscover_posts p
            WHERE p.type = 'template'
            AND p.status = 'active'
            ORDER BY p.title ASC
            LIMIT ?",
            [$limit]
        );
        $catalog = [];
        foreach ($rows as $row) {
            $id = (int) $row['id'];
            $fields = Query::fetchAll(
                'SELECT name, type, position
                FROM ielectro_dyscover.dyscover_template_fields
                WHERE template_id = ?
                ORDER BY position ASC',
                [$id]
            );
            $catalog[] = [
                'id' => $id,
                'title' => (string) ($row['title'] ?? ''),
                'description' => (string) ($row['description'] ?? ''),
                'fields' => array_map(
                    static fn(array $field): array => [
                        'name' => (string) ($field['name'] ?? ''),
                        'type' => (string) ($field['type'] ?? 'text'),
                        'slug' => self::fieldSlug((string) ($field['name'] ?? '')),
                    ],
                    $fields
                ),
            ];
        }
        return $catalog;
    }
    public static function fieldSlug(string $name): string
    {
        $raw = trim($name);
        if ($raw === '_title') {
            return '_title';
        }
        $slug = strtolower((string) preg_replace('/[^a-z0-9]+/i', '-', $raw));
        return trim($slug, '-');
    }
    public static function formatContext(array $references): string
    {
        if ($references === []) {
            return 'No related Dyscover content was found. Invent consistent details that fit the user brief.';
        }
        $chunks = [];
        foreach ($references as $index => $ref) {
            $chunks[] = sprintf('[%d] %s — %s', $index + 1, $ref['title'], $ref['snippet']);
        }
        return "Use ONLY to understand the fictional world (places, people, institutions).\n"
            . "Do NOT copy, paraphrase, or repeat these passages.\n\n"
            . implode("\n", $chunks);
    }
    public static function knownPlaces(): array
    {
        return [
            'destenia', 'agaritia', 'fesia', 'edrobea', 'edrobean', 'kashiria', 'lamberia',
            'jarnovia', 'comussania', 'cusea', 'ricene', 'valmirica', 'verdania', 'boravia',
            'alveria', 'metosia', 'stasia', 'suklan', 'laocitia', 'sifalam',
        ];
    }
    public static function extractOfficeRole(string $articleTitle): string
    {
        $text = mb_strtolower(trim($articleTitle));
        if (str_contains($text, 'prime minister') || str_contains($text, 'premier')) {
            return 'prime minister';
        }
        if (str_contains($text, 'president')) {
            return 'president';
        }
        if (str_contains($text, 'minister of')) {
            return 'minister';
        }
        return '';
    }
    public static function scoreLinkRelevance(array $link, string $primaryEntity, string $articleTitle = ''): int
    {
        $linkTitle = mb_strtolower(trim((string) ($link['title'] ?? '')));
        $entity = mb_strtolower(trim($primaryEntity));
        $title = mb_strtolower(trim($articleTitle));
        $score = 0;
        if ($entity !== '') {
            if (str_contains($linkTitle, $entity)) {
                $score += 24;
            } else {
                foreach (self::knownPlaces() as $place) {
                    if ($place !== $entity && str_contains($linkTitle, $place)) {
                        return -100;
                    }
                }
                if (preg_match('/\b(?:in|of|for)\s+[a-z]/', $linkTitle)) {
                    return -40;
                }
            }
        }
        foreach (preg_split('/\s+/u', $title) ?: [] as $word) {
            $word = mb_strtolower(preg_replace('/[^a-z0-9]/u', '', $word) ?? '');
            if ($word !== '' && strlen($word) >= 4 && str_contains($linkTitle, $word)) {
                $score += 10;
            }
        }
        $role = self::extractOfficeRole($articleTitle);
        if ($role !== '' && str_contains($linkTitle, $role)) {
            $score += 12;
        }
        return $score;
    }
    public static function filterLinksForTopic(array $links, string $primaryEntity, string $articleTitle = ''): array
    {
        $filtered = [];
        foreach ($links as $link) {
            $score = self::scoreLinkRelevance($link, $primaryEntity, $articleTitle);
            if ($score < 8) {
                continue;
            }
            $link['relevance_score'] = $score;
            $filtered[] = $link;
        }
        usort(
            $filtered,
            static fn(array $a, array $b): int => ($b['relevance_score'] ?? 0) <=> ($a['relevance_score'] ?? 0)
        );
        return $filtered;
    }
    public static function filterMediaForTopic(array $media, string $primaryEntity, string $articleTitle = ''): array
    {
        $entity = mb_strtolower(trim($primaryEntity));
        $role = self::extractOfficeRole($articleTitle);
        $filtered = [];
        foreach ($media as $item) {
            $mediaTitle = mb_strtolower(trim((string) ($item['title'] ?? '')));
            if ($entity !== '' && !str_contains($mediaTitle, $entity)) {
                continue;
            }
            if ($role !== '' && !str_contains($mediaTitle, $role)) {
                $portraitOk = str_contains($mediaTitle, 'portrait')
                    || str_contains($mediaTitle, 'official')
                    || str_contains($mediaTitle, 'photo');
                if (!$portraitOk) {
                    continue;
                }
            }
            $filtered[] = $item;
        }
        return $filtered;
    }
    public static function formatLinkCatalog(array $links, int $limit = 24): string
    {
        if ($links === []) {
            return 'No verified article links available. Do NOT invent [[Label|url]] links.';
        }
        $lines = ['Use ONLY these verified article links (exact URL):'];
        foreach (array_slice($links, 0, $limit) as $ref) {
            $lines[] = '- [[' . $ref['title'] . '|' . $ref['url'] . ']]';
        }
        return implode("\n", $lines);
    }
    public static function formatMediaCatalog(array $media, int $limit = 18): string
    {
        if ($media === []) {
            return 'No verified media posts available. Do NOT invent image/video/audio URLs.';
        }
        $lines = ['Use ONLY these verified media URLs from Dyscover posts:'];
        foreach (array_slice($media, 0, $limit) as $item) {
            $lines[] = '- ' . $item['type'] . ': ' . $item['title'] . ' → ' . $item['media_url'];
        }
        return implode("\n", $lines);
    }
    public static function sanitizeSource(string $source, array $links, array $media): string
    {
        $allowedArticles = [];
        foreach ($links as $link) {
            if (!empty($link['url'])) {
                $allowedArticles[self::normalizeUrl((string) $link['url'])] = true;
            }
        }
        $allowedMedia = [];
        foreach ($media as $item) {
            if (!empty($item['media_url'])) {
                $allowedMedia[self::normalizeUrl((string) $item['media_url'])] = true;
            }
        }
        foreach (self::extractSourceMediaUrls($source) as $url) {
            $allowedMedia[self::normalizeUrl($url)] = true;
        }
        $source = (string) preg_replace_callback(
            '/\[\[([^|\]]+)\|([^\]]+)\]\]/u',
            static function (array $matches) use ($allowedArticles): string {
                $label = trim($matches[1]);
                $url = self::normalizeUrl(trim($matches[2]));
                if ($url !== '' && isset($allowedArticles[$url])) {
                    return '[[' . $label . '|' . $url . ']]';
                }
                return $label !== '' ? '**' . $label . '**' : '';
            },
            $source
        );
        $source = (string) preg_replace_callback(
            '/\{\{(image|image-table|icon-image|video|audio|template-single-image|template-large-image)\|([^|{}]+)(?:\|([^{}]*))?\}\}/iu',
            static function (array $matches) use ($allowedMedia): string {
                $macro = $matches[1];
                $url = self::normalizeUrl(trim($matches[2]));
                if ($url === '' || !isset($allowedMedia[$url])) {
                    return '';
                }
                $caption = trim($matches[3] ?? '');
                return $caption !== ''
                    ? '{{' . $macro . '|' . $url . '|' . $caption . '}}'
                    : '{{' . $macro . '|' . $url . '}}';
            },
            $source
        );
        $source = (string) preg_replace_callback(
            '/\{\{template-double-image\|([^}]+)\}\}/iu',
            static function (array $matches) use ($allowedMedia): string {
                $parts = array_map('trim', explode(';;', $matches[1]));
                $valid = [];
                foreach ($parts as $part) {
                    $url = self::normalizeUrl($part);
                    if ($url !== '' && isset($allowedMedia[$url])) {
                        $valid[] = $url;
                    }
                }
                return $valid !== [] ? '{{template-double-image|' . implode(' ;; ', $valid) . '}}' : '';
            },
            $source
        );
        $source = preg_replace("/\n{3,}/", "\n\n", $source) ?? $source;
        return trim($source);
    }
    private static function searchPosts(
        string $prompt,
        string $title,
        ?string $excludeUuid,
        array $types,
        int $limit,
        bool $requireUrl
    ): array {
        $keywords = self::topicKeywords($prompt, $title);
        if ($keywords === []) {
            return [];
        }
        $typeList = implode(',', array_map(
            static fn(string $type): string => "'" . str_replace("'", "''", $type) . "'",
            $types
        ));
        $scoreParams = [];
        $whereParams = [];
        $scoreParts = [];
        $whereParts = [];
        foreach ($keywords as $word) {
            $like = '%' . $word . '%';
            $scoreParts[] = '(CASE WHEN LOWER(p.title) LIKE ? THEN 5 ELSE 0 END
                + CASE WHEN LOWER(COALESCE(p.description, \'\')) LIKE ? THEN 2 ELSE 0 END
                + CASE WHEN EXISTS (
                    SELECT 1
                    FROM ielectro_dyscover.dyscover_post_tags pt
                    INNER JOIN ielectro_dyscover.dyscover_tags t ON t.id = pt.tag_id
                    WHERE pt.post_id = p.id
                    AND LOWER(t.name) LIKE ?
                ) THEN 4 ELSE 0 END)';
            $scoreParams[] = $like;
            $scoreParams[] = $like;
            $scoreParams[] = $like;
            $whereParts[] = '(LOWER(p.title) LIKE ? OR LOWER(COALESCE(p.description, \'\')) LIKE ? OR EXISTS (
                SELECT 1
                FROM ielectro_dyscover.dyscover_post_tags pt
                INNER JOIN ielectro_dyscover.dyscover_tags t ON t.id = pt.tag_id
                WHERE pt.post_id = p.id
                AND LOWER(t.name) LIKE ?
            ))';
            $whereParams[] = $like;
            $whereParams[] = $like;
            $whereParams[] = $like;
        }
        $params = array_merge($scoreParams, $whereParams);
        $sql = 'SELECT p.id, p.uuid, p.type, p.title, p.description, p.user_id, p.extension,
            (' . implode(' + ', $scoreParts) . ') AS relevance
            FROM ielectro_dyscover.dyscover_posts p
            WHERE p.status = \'active\'
            AND p.type IN (' . $typeList . ')
            AND (' . implode(' OR ', $whereParts) . ')';
        if ($excludeUuid !== null && $excludeUuid !== '') {
            $sql .= ' AND p.uuid <> ?';
            $params[] = $excludeUuid;
        }
        $sql .= ' ORDER BY relevance DESC, p.updated_at DESC LIMIT ' . (int) $limit;
        $rows = Query::fetchAll($sql, $params);
        $postIds = array_map(static fn(array $row): int => (int) ($row['id'] ?? 0), $rows);
        $tagMap = PostTags::mapForPosts($postIds);
        $results = [];
        foreach ($rows as $row) {
            $uuid = (string) $row['uuid'];
            $userId = (int) $row['user_id'];
            $type = (string) $row['type'];
            $url = $type === 'article' ? self::articleUrl($uuid) : '';
            $mediaUrl = self::postMediaUrl($row);
            if ($requireUrl && $type === 'article' && $url === '') {
                continue;
            }
            if ($requireUrl && in_array($type, ['image', 'video', 'audio'], true) && $mediaUrl === '') {
                continue;
            }
            $snippet = trim((string) ($row['description'] ?? ''));
            if ($type === 'article' && $snippet === '') {
                $path = PostAssets::articlePath($userId, $uuid);
                if (is_file($path)) {
                    $html = (string) file_get_contents($path);
                    $paragraph = ArticleContent::extractFirstParagraph($html);
                    $snippet = $paragraph !== ''
                        ? self::htmlToText($paragraph)
                        : mb_substr(self::htmlToText($html), 0, 220);
                }
            }
            $entry = [
                'id' => (int) $row['id'],
                'uuid' => $uuid,
                'type' => $type,
                'title' => (string) ($row['title'] ?? ''),
                'url' => $url,
                'media_url' => $mediaUrl,
                'snippet' => mb_substr($snippet, 0, 220),
                'user_id' => $userId,
                'tags' => $tagMap[(int) $row['id']] ?? [],
            ];
            $results[] = $entry;
        }
        return $results;
    }
    private static function scoreTemplate(
        array $template,
        string $topic,
        bool $isOfficeTopic,
        bool $isCountryTopic
    ): int {
        $score = 0;
        $title = mb_strtolower((string) ($template['title'] ?? ''));
        $keywords = self::keywords($topic);
        foreach ($keywords as $word) {
            if ($word !== '' && str_contains($title, $word)) {
                $score += 3;
            }
        }
        if ($isOfficeTopic && str_contains($title, 'country')) {
            $score -= 25;
        }
        if ($isOfficeTopic && (str_contains($title, 'office') || str_contains($title, 'president') || str_contains($title, 'official'))) {
            $score += 12;
        }
        if ($isCountryTopic && str_contains($title, 'country')) {
            $score += 15;
        }
        $countryFields = 0;
        $officeFields = 0;
        $fieldMatches = 0;
        foreach ($template['fields'] as $field) {
            $name = mb_strtolower((string) ($field['name'] ?? '') . ' ' . (string) ($field['slug'] ?? ''));
            foreach ($keywords as $word) {
                if ($word !== '' && str_contains($name, $word)) {
                    $fieldMatches += 2;
                }
            }
            foreach (self::COUNTRY_FIELD_HINTS as $hint) {
                if (str_contains($name, $hint)) {
                    $countryFields++;
                }
            }
            foreach (self::OFFICE_FIELD_HINTS as $hint) {
                if (str_contains($name, $hint)) {
                    $officeFields++;
                }
            }
        }
        $score += $fieldMatches;
        if ($isOfficeTopic) {
            $score += $officeFields * 4;
            $score -= $countryFields * 3;
        }
        if ($isCountryTopic) {
            $score += $countryFields * 3;
        }
        return $score;
    }
    public static function topicKeywords(string $prompt, string $title = ''): array
    {
        $words = self::keywords($prompt . ' ' . $title);
        $combined = mb_strtolower($prompt . ' ' . $title);
        $roleHints = [
            'president' => ['president', 'presidente', 'head', 'state', 'office', 'mandate', 'executive'],
            'prime minister' => ['prime', 'minister', 'premier', 'government', 'executive', 'cabinet'],
            'minister' => ['minister', 'ministry', 'cabinet', 'department', 'portfolio'],
            'speaker' => ['speaker', 'parliament', 'legislature', 'senate', 'chamber'],
            'official' => ['official', 'bureaucrat', 'administration', 'civil', 'service'],
        ];
        foreach ($roleHints as $needle => $extras) {
            if (str_contains($combined, $needle)) {
                $words = array_merge($words, $extras);
            }
        }
        return array_values(array_unique(array_slice($words, 0, 18)));
    }
    private static function postMediaUrl(array $row): string
    {
        $userId = (int) ($row['user_id'] ?? 0);
        $uuid = (string) ($row['uuid'] ?? '');
        $type = (string) ($row['type'] ?? '');
        $extension = (string) ($row['extension'] ?? '');
        if ($uuid === '' || $userId <= 0) {
            return '';
        }
        if (!in_array($type, ['image', 'video', 'audio', 'document'], true)) {
            return '';
        }
        if ($extension === '') {
            return (string) ($row['preview_image'] ?? '');
        }
        return PostAssets::mediaUrl($userId, $type, $uuid, $extension);
    }
    private static function articleUrl(string $uuid): string
    {
        return rtrim((string) APP_URL, '/') . '/article/' . rawurlencode($uuid);
    }
    private static function normalizeUrl(string $url): string
    {
        return rtrim(trim($url), '/');
    }
    private static function keywords(string $text): array
    {
        $text = mb_strtolower(trim($text));
        $parts = preg_split('/\s+/u', $text) ?: [];
        $words = [];
        foreach ($parts as $part) {
            $word = preg_replace('/[^a-z0-9àèéìòù]/u', '', $part) ?? '';
            if (strlen($word) < 3 || in_array($word, self::STOP_WORDS, true)) {
                continue;
            }
            $words[] = $word;
        }
        return array_values(array_unique($words));
    }
    public static function extractTopicTerms(string $prompt, string $title): array
    {
        $fallback = [
            'terms' => self::topicKeywords($prompt, $title),
            'primary_entity' => self::guessPrimaryEntity($prompt, $title),
            'archetype' => self::guessArchetype($prompt, $title),
            'political_party' => '',
            'related_tags' => [],
        ];
        try {
            $raw = Client::chat([
                [
                    'role' => 'system',
                    'content' => 'Extract search terms for a fictional encyclopedia. Reply ONLY with compact JSON: '
                        . '{"terms":["word1"],"primary_entity":"Place","archetype":"president|country|organization|person|other",'
                        . '"political_party":"PartyNameOrEmpty","related_tags":["tag1","tag2"]}. '
                        . 'Terms must be concrete nouns for database search. related_tags are lowercase Dyscover tags.',
                ],
                [
                    'role' => 'user',
                    'content' => "Title: {$title}\nBrief: {$prompt}",
                ],
            ], 0.1, 180, Client::fastModel());
            if (preg_match('/\{[\s\S]*\}/', $raw, $match)) {
                $json = json_decode($match[0], true);
                if (is_array($json) && !empty($json['terms']) && is_array($json['terms'])) {
                    $terms = array_values(array_unique(array_filter(array_map(
                        static fn($term): string => mb_strtolower(trim((string) $term)),
                        $json['terms']
                    ))));
                    if ($terms !== []) {
                        $relatedTags = [];
                        if (!empty($json['related_tags']) && is_array($json['related_tags'])) {
                            foreach ($json['related_tags'] as $tag) {
                                $tag = mb_strtolower(trim((string) $tag));
                                if ($tag !== '') {
                                    $relatedTags[] = $tag;
                                }
                            }
                        }
                        $party = self::normalizeTopicEntity($json['political_party'] ?? '');
                        if ($party !== '') {
                            $terms[] = mb_strtolower($party);
                            $relatedTags[] = mb_strtolower($party);
                        }
                        return [
                            'terms' => array_values(array_unique(array_slice($terms, 0, 12))),
                            'primary_entity' => self::normalizeTopicEntity($json['primary_entity'] ?? $fallback['primary_entity']),
                            'archetype' => self::normalizeTopicEntity($json['archetype'] ?? $fallback['archetype']),
                            'political_party' => $party,
                            'related_tags' => array_values(array_unique($relatedTags)),
                        ];
                    }
                }
            }
        } catch (\Throwable) {
            // fallback below
        }
        return $fallback;
    }
    private static function normalizeTopicEntity(mixed $value): string
    {
        if (is_array($value)) {
            $parts = array_values(array_filter(array_map(
                static fn($item): string => trim((string) $item),
                $value
            )));
            return $parts !== [] ? $parts[0] : '';
        }
        return trim((string) $value);
    }
    public static function searchByTerms(
        array $terms,
        string $primaryEntity,
        ?string $excludeUuid,
        array $types,
        int $limit,
        bool $strictEntity = false
    ): array {
        if ($terms === []) {
            return [];
        }
        $query = implode(' ', $terms);
        $results = self::searchPosts($query, $primaryEntity, $excludeUuid, $types, $limit * 3, false);
        $scored = [];
        foreach ($results as $row) {
            $score = self::scorePostForTopic($row, $terms, $primaryEntity, $strictEntity);
            if ($score < 4) {
                continue;
            }
            $row['topic_score'] = $score;
            $scored[] = $row;
        }
        usort(
            $scored,
            static fn(array $a, array $b): int => ($b['topic_score'] ?? 0) <=> ($a['topic_score'] ?? 0)
        );
        return array_slice($scored, 0, $limit);
    }
    public static function loadArticleCorpus(array $articles, int $maxChars = 6000): string
    {
        $chunks = [];
        $length = 0;
        foreach ($articles as $article) {
            if (($article['type'] ?? '') !== 'article') {
                continue;
            }
            $userId = (int) ($article['user_id'] ?? 0);
            $uuid = (string) ($article['uuid'] ?? '');
            if ($uuid === '' || $userId <= 0) {
                continue;
            }
            $path = PostAssets::articlePath($userId, $uuid);
            if (!is_file($path)) {
                continue;
            }
            $text = ArticleContent::extractPlainText((string) file_get_contents($path), 1800);
            if ($text === '') {
                continue;
            }
            $block = '[' . ($article['title'] ?? 'Article') . "]\n" . $text;
            if ($length + mb_strlen($block) > $maxChars) {
                break;
            }
            $chunks[] = $block;
            $length += mb_strlen($block);
        }
        return $chunks === []
            ? 'No related article text found in Dyscover.'
            : implode("\n\n", $chunks);
    }
    public static function extractReferenceOutline(array $articles): array
    {
        foreach ($articles as $article) {
            if (($article['type'] ?? '') !== 'article') {
                continue;
            }
            $userId = (int) ($article['user_id'] ?? 0);
            $uuid = (string) ($article['uuid'] ?? '');
            if ($uuid === '' || $userId <= 0) {
                continue;
            }
            $path = PostAssets::articlePath($userId, $uuid);
            if (!is_file($path)) {
                continue;
            }
            $outline = ArticleContent::extractOutline((string) file_get_contents($path));
            if ($outline !== []) {
                return $outline;
            }
        }
        return [];
    }
    public static function pickMediaForField(
        array $media,
        array $field,
        array $terms,
        string $primaryEntity,
        string $articleTitle = ''
    ): ?array {
        $name = mb_strtolower((string) ($field['name'] ?? '') . ' ' . (string) ($field['slug'] ?? ''));
        $wantImage = str_contains($name, 'image') || str_contains($name, 'photo') || str_contains($name, 'portrait')
            || in_array($field['type'] ?? '', ['single-image', 'large-image', 'double-image'], true);
        if (!$wantImage) {
            return null;
        }
        $entity = mb_strtolower(trim($primaryEntity));
        $role = self::extractOfficeRole($articleTitle);
        $best = null;
        $bestScore = 0;
        foreach ($media as $item) {
            if (($item['type'] ?? '') !== 'image' || empty($item['media_url'])) {
                continue;
            }
            $mediaTitle = mb_strtolower((string) ($item['title'] ?? ''));
            if ($entity !== '' && !str_contains($mediaTitle, $entity)) {
                continue;
            }
            $score = (int) ($item['topic_score'] ?? self::scorePostForTopic($item, $terms, $primaryEntity, true));
            if ($role !== '' && str_contains($mediaTitle, $role)) {
                $score += 20;
            } elseif ($role !== '' && (str_contains($mediaTitle, 'president') || str_contains($mediaTitle, 'prime minister'))) {
                continue;
            }
            if (str_contains($name, 'portrait') && str_contains($mediaTitle, 'portrait')) {
                $score += 8;
            }
            if (str_contains($name, 'flag') && str_contains($mediaTitle, 'flag')) {
                $score += 8;
            }
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $item;
            }
        }
        return $bestScore >= 8 ? $best : null;
    }
    public static function formatElementsDictionary(): string
    {
        $path = dirname(__DIR__) . '/data/elements.json';
        if (!is_file($path)) {
            return '';
        }
        $elements = json_decode((string) file_get_contents($path), true);
        if (!is_array($elements)) {
            return '';
        }
        $allowed = [
            'paragraph', 'heading', 'sub-heading', 'bold', 'italic', 'link', 'caption',
            'point-list', 'number-list', 'table', 'image', 'image-table', 'icon-image',
            'video', 'audio', 'percent', 'legend',
        ];
        $lines = ['Use ONLY these Dyscover Source elements from the editor dictionary:'];
        foreach ($elements as $element) {
            $key = (string) ($element['element'] ?? '');
            if ($key === '' || !in_array($key, $allowed, true)) {
                continue;
            }
            $title = (string) ($element['title'] ?? $key);
            $regex = (string) ($element['regex'] ?? '');
            $lines[] = $regex !== '' ? "- {$title}: {$regex}" : "- {$title}";
        }
        return implode("\n", $lines);
    }
    public static function splitTemplateBody(string $source): array
    {
        if (!preg_match('/^\{\{template\|[\s\S]*?\n\}\}/m', $source, $match, PREG_OFFSET_CAPTURE)) {
            return ['', $source];
        }
        $block = trim($match[0][0]);
        $rest = substr($source, $match[0][1] + strlen($match[0][0]));
        return [$block, ltrim(self::stripOrphanLinkClauses($rest))];
    }
    public static function sanitizeTemplateBlock(string $block): string
    {
        if ($block === '') {
            return '';
        }
        $lines = preg_split("/\r\n|\n|\r/", $block) ?: [];
        $output = [];
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if (preg_match('/^\|/', $trimmed)) {
                $line = self::stripInlineLinksFromTemplateField($line);
            }
            if ($trimmed === '}}' || str_starts_with($trimmed, '}}')) {
                $output[] = '}}';
                continue;
            }
            $output[] = $line;
        }
        return trim(implode("\n", $output));
    }
    public static function stripOrphanLinkClauses(string $text): string
    {
        $text = (string) preg_replace(
            '/\s*\(\[\[[^\]]+\|[^\]]+\]\](?:,\s*\[\[[^\]]+\|[^\]]+\]\])*\)\.?/u',
            '',
            $text
        );
        $text = (string) preg_replace('/\s+\(\[\[[^\]]+\|[^\]]+\]\]\)\.?/u', '', $text);
        return trim($text);
    }
    private static function stripInlineLinksFromTemplateField(string $line): string
    {
        $line = (string) preg_replace(
            '/\s*\(\[\[[^\]]+\|[^\]]+\]\](?:,\s*\[\[[^\]]+\|[^\]]+\]\])*\)\.?/u',
            '',
            $line
        );
        return (string) preg_replace('/\[\[[^\]|]+\|[^\]]+\]\]/u', '', $line);
    }
    public static function finalizeSource(
        string $source,
        array $links,
        array $media,
        string $primaryEntity = '',
        string $articleTitle = ''
    ): string {
        $links = self::filterLinksForTopic($links, $primaryEntity, $articleTitle);
        [$template, $body] = self::splitTemplateBody($source);
        $template = self::sanitizeTemplateBlock($template);
        $body = self::enforceArticleStructure($body);
        $body = self::enrichParagraphLinks($body, $links, $primaryEntity, $articleTitle);
        $source = $template === '' ? $body : trim($template . "\n\n" . $body);
        $source = self::stripOrphanLinkClauses($source);
        $source = self::sanitizeSource($source, $links, $media);
        $source = self::stripBadProse($source);
        $source = self::enforceMediaAfterHeadings($source);
        return trim($source);
    }
    public static function isParagraphLine(string $line): bool
    {
        $trimmed = trim($line);
        if ($trimmed === '') {
            return false;
        }
        if (preg_match('/^#{1,6}\s+/', $trimmed)) {
            return false;
        }
        if (preg_match('/^\{\{/', $trimmed)) {
            return false;
        }
        if (preg_match('/^[\-*]\s+/', $trimmed)) {
            return false;
        }
        if (preg_match('/^\d+\.\s+/', $trimmed)) {
            return false;
        }
        if (preg_match('/^\|/', $trimmed)) {
            return false;
        }
        if (preg_match('/^>/', $trimmed)) {
            return false;
        }
        return true;
    }
    public static function enforceArticleStructure(string $source): string
    {
        $lines = preg_split("/\r\n|\n|\r/", $source) ?: [];
        $templateLines = [];
        $bodyLines = [];
        $inTemplate = false;
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if (!$inTemplate && preg_match('/^\{\{template\|/', $trimmed)) {
                $inTemplate = true;
            }
            if ($inTemplate) {
                $templateLines[] = $line;
                if ($trimmed === '}}') {
                    $inTemplate = false;
                }
                continue;
            }
            $bodyLines[] = $line;
        }
        $output = [];
        $leadParagraphs = [];
        $leadDone = false;
        $afterTopHeading = false;
        $inSubsection = false;
        $subsectionParagraphs = 0;
        foreach ($bodyLines as $line) {
            $trimmed = trim($line);
            if (!$leadDone && preg_match('/^#\s+/', $trimmed) && !preg_match('/^##\s+/', $trimmed)) {
                $leadDone = true;
                if (count($leadParagraphs) > 5) {
                    $leadParagraphs = array_slice($leadParagraphs, 0, 5);
                }
                foreach ($leadParagraphs as $leadLine) {
                    $output[] = $leadLine;
                }
                if ($leadParagraphs !== []) {
                    $output[] = '';
                }
                $afterTopHeading = true;
                $inSubsection = false;
                $output[] = $line;
                continue;
            }
            if (!$leadDone) {
                if (self::isParagraphLine($line)) {
                    $leadParagraphs[] = $line;
                } else {
                    $output[] = $line;
                }
                continue;
            }
            if (preg_match('/^#\s+/', $trimmed) && !preg_match('/^##\s+/', $trimmed)) {
                $afterTopHeading = true;
                $inSubsection = false;
                $subsectionParagraphs = 0;
                $output[] = $line;
                continue;
            }
            if (preg_match('/^##\s+/', $trimmed)) {
                $afterTopHeading = false;
                $inSubsection = true;
                $subsectionParagraphs = 0;
                $output[] = $line;
                continue;
            }
            if ($afterTopHeading && self::isParagraphLine($line)) {
                continue;
            }
            if ($inSubsection && self::isParagraphLine($line)) {
                if ($subsectionParagraphs >= 5) {
                    continue;
                }
                $subsectionParagraphs++;
            }
            $output[] = $line;
        }
        if (!$leadDone) {
            if (count($leadParagraphs) > 5) {
                $leadParagraphs = array_slice($leadParagraphs, 0, 5);
            }
            $output = array_merge($leadParagraphs, $output === [] ? [] : ['', ...$output]);
        }
        $structured = trim(implode("\n", $output));
        if ($templateLines === []) {
            return $structured;
        }
        return trim(implode("\n", $templateLines) . "\n\n" . $structured);
    }
    public static function enrichParagraphLinks(
        string $source,
        array $links,
        string $primaryEntity = '',
        string $articleTitle = ''
    ): string {
        $links = self::filterLinksForTopic($links, $primaryEntity, $articleTitle);
        if ($links === []) {
            return self::stripOrphanLinkClauses($source);
        }
        $catalog = [];
        foreach ($links as $link) {
            $title = trim((string) ($link['title'] ?? ''));
            $url = trim((string) ($link['url'] ?? ''));
            if ($title === '' || $url === '') {
                continue;
            }
            $catalog[] = [
                'title' => $title,
                'url' => $url,
                'score' => self::scoreLinkRelevance($link, $primaryEntity, $articleTitle),
            ];
        }
        if ($catalog === []) {
            return self::stripOrphanLinkClauses($source);
        }
        usort(
            $catalog,
            static fn(array $a, array $b): int => ($b['score'] ?? 0) <=> ($a['score'] ?? 0)
                ?: mb_strlen($b['title']) <=> mb_strlen($a['title'])
        );
        $lines = preg_split("/\r\n|\n|\r/", $source) ?: [];
        foreach ($lines as $index => $line) {
            if (!self::isParagraphLine($line)) {
                continue;
            }
            foreach ($catalog as $entry) {
                if (($entry['score'] ?? 0) < 10) {
                    continue;
                }
                $title = $entry['title'];
                $url = $entry['url'];
                if (str_contains($line, '[[' . $title . '|')) {
                    continue;
                }
                $quoted = preg_quote($title, '/');
                $pattern = '/(?<!\[\[)(?<!\|)(?<!\*)' . $quoted . '(?!\]\])(?!\*)/iu';
                if (preg_match($pattern, $line)) {
                    $line = (string) preg_replace(
                        $pattern,
                        '[[' . $title . '|' . $url . ']]',
                        $line,
                        1
                    );
                }
                $entity = mb_strtolower(trim($primaryEntity));
                if ($entity !== '' && mb_strlen($entity) >= 4 && str_contains($line, '[[' . $entity . '|')) {
                    continue;
                }
                if ($entity !== '' && preg_match('/(?<!\[\[)\b' . preg_quote($entity, '/') . '\b(?!\]\])/iu', $line)) {
                    foreach ($catalog as $entityLink) {
                        if (!str_contains(mb_strtolower($entityLink['title']), $entity)) {
                            continue;
                        }
                        if (str_contains($line, '[[' . $entityLink['title'] . '|')) {
                            break;
                        }
                        $line = (string) preg_replace(
                            '/(?<!\[\[)\b' . preg_quote($entity, '/') . '\b(?!\]\])/iu',
                            '[[' . $entityLink['title'] . '|' . $entityLink['url'] . ']]',
                            $line,
                            1
                        );
                        break;
                    }
                }
            }
            $lines[$index] = $line;
        }
        return self::stripOrphanLinkClauses(trim(implode("\n", $lines)));
    }
    private static function extractSourceMediaUrls(string $source): array
    {
        $urls = [];
        if (preg_match_all(
            '/\{\{(?:template-single-image|template-large-image|template-double-image|audio|image|image-table|icon-image|video)\|([^}|]+)/iu',
            $source,
            $matches
        )) {
            foreach ($matches[1] as $part) {
                foreach (array_map('trim', explode(';;', (string) $part)) as $url) {
                    if ($url !== '') {
                        $urls[] = $url;
                    }
                }
            }
        }
        return $urls;
    }
    public static function stripBadProse(string $source): string
    {
        $replacements = [
            '/To learn more about[^.\n]*\./iu' => '',
            '/click on the following link[^.\n]*\./iu' => '',
            '/For more information[^.\n]*\./iu' => '',
            '/not provided in the corpus[^.\n]*\./iu' => '',
            '/not specified in the corpus[^.\n]*\./iu' => '',
            '/is not provided[^.\n]*\./iu' => '',
            '/party affiliation not specified[^.\n]*\./iu' => '',
            '/however, the current incumbent[^.\n]*\./iu' => '',
            '/\. > See also:/iu' => '.',
            '/\[\[[^\]|]+\|[^\]]+\]\]\.\s*>/u' => '',
            '/\|\s*fields\s*=/iu' => '',
            '/\|\s*\(content for "[^"]+"\)/iu' => '',
        ];
        foreach ($replacements as $pattern => $replacement) {
            $source = (string) preg_replace($pattern, $replacement, $source);
        }
        $source = (string) preg_replace("/\n{3,}/", "\n\n", $source);
        return trim($source);
    }
    public static function enforceMediaAfterHeadings(string $source): string
    {
        $lines = preg_split("/\r\n|\n|\r/", $source) ?: [];
        $output = [];
        $seenHeading = false;
        $mediaPattern = '/^\{\{(image|image-table|icon-image|video|audio)\|/i';
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if (preg_match('/^#{1,2}\s+/', $trimmed)) {
                $seenHeading = true;
            }
            if (!$seenHeading && preg_match($mediaPattern, $trimmed)) {
                continue;
            }
            $output[] = $line;
        }
        return trim(implode("\n", $output));
    }
    private static function scorePostForTopic(
        array $post,
        array $terms,
        string $primaryEntity,
        bool $strictEntity
    ): int {
        $title = mb_strtolower((string) ($post['title'] ?? ''));
        $description = mb_strtolower((string) ($post['snippet'] ?? $post['description'] ?? ''));
        $tags = array_map('mb_strtolower', (array) ($post['tags'] ?? []));
        $haystack = $title . ' ' . $description . ' ' . implode(' ', $tags);
        $score = 0;
        $entity = mb_strtolower(trim($primaryEntity));
        if ($entity !== '') {
            if (str_contains($title, $entity)) {
                $score += 12;
            } elseif ($strictEntity && in_array($post['type'] ?? '', ['image', 'video', 'audio'], true)) {
                return 0;
            } elseif ($strictEntity && !str_contains($haystack, $entity)) {
                $score -= 8;
            }
        }
        foreach ($terms as $term) {
            $term = mb_strtolower(trim((string) $term));
            if ($term === '' || strlen($term) < 3) {
                continue;
            }
            if (str_contains($title, $term)) {
                $score += 5;
            } elseif (str_contains($description, $term)) {
                $score += 2;
            } else {
                foreach ($tags as $tag) {
                    if ($tag !== '' && (str_contains($tag, $term) || str_contains($term, $tag))) {
                        $score += 4;
                        break;
                    }
                }
            }
        }
        return $score;
    }
    public static function appendPortraitMedia(
        array $media,
        array $terms,
        string $primaryEntity,
        ?string $excludeUuid,
        string $articleTitle = ''
    ): array {
        $entity = mb_strtolower(trim($primaryEntity));
        if ($entity === '') {
            return $media;
        }
        $role = self::extractOfficeRole($articleTitle);
        $searchTerms = array_merge($terms, [$entity]);
        if ($role !== '') {
            $searchTerms[] = $role;
        } else {
            $searchTerms[] = 'portrait';
        }
        $extra = self::searchByTerms(
            $searchTerms,
            $primaryEntity,
            $excludeUuid,
            ['image'],
            6,
            true
        );
        $merged = [];
        foreach (array_merge($extra, $media) as $item) {
            $uuid = (string) ($item['uuid'] ?? '');
            if ($uuid !== '') {
                $merged[$uuid] = $item;
            }
        }
        $ranked = array_values($merged);
        usort(
            $ranked,
            static fn(array $a, array $b): int => ($b['topic_score'] ?? 0) <=> ($a['topic_score'] ?? 0)
        );
        return $ranked;
    }
    private static function guessPrimaryEntity(string $prompt, string $title): string
    {
        $text = trim($title . ' ' . $prompt);
        if (preg_match('/\b(?:of|di|della|del)\s+([A-ZÀ-Ü][A-Za-zÀ-ÖØ-öø-ÿ\-]+(?:\s+[A-ZÀ-Ü][A-Za-zÀ-ÖØ-öø-ÿ\-]+)*)/u', $text, $match)) {
            return trim($match[1]);
        }
        if (preg_match('/\b([A-ZÀ-Ü][A-Za-zÀ-ÖØ-öø-ÿ\-]{2,})\b/u', $text, $match)) {
            return trim($match[1]);
        }
        return '';
    }
    private static function guessArchetype(string $prompt, string $title): string
    {
        $text = mb_strtolower($prompt . ' ' . $title);
        if (preg_match('/president|presidente|head of state|ruler|commander in chief/i', $text)) {
            return 'president';
        }
        if (preg_match('/prime minister|premier|primo ministro/i', $text)) {
            return 'prime-minister';
        }
        if (preg_match('/minister of|ministro/i', $text)) {
            return 'minister';
        }
        if (preg_match('/\b(country|republic|nation|kingdom)\b/i', $text)) {
            return 'country';
        }
        if (preg_match('/\b(organization|community|union|alliance)\b/i', $text)) {
            return 'organization';
        }
        return 'other';
    }
    private static function htmlToText(string $html): string
    {
        $html = preg_replace('/<script\b[^>]*>.*?<\/script>/is', '', $html) ?? $html;
        $html = preg_replace('/<style\b[^>]*>.*?<\/style>/is', '', $html) ?? $html;
        $text = strip_tags($html);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
        return trim($text);
    }
}
