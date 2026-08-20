<?php
namespace Dyscover;
use Nesh\Identity;
use Nesh\Ai\Client;
use Nesh\Query;
use Nesh\Request;
use Nesh\Response;
use Nesh\Validate;
require_once __DIR__ . '/posts.php';
require_once __DIR__ . '/article-knowledge.php';
require_once __DIR__ . '/article-playbook.php';
class ArticleGenerate
{
    private const MIN_TEMPLATE_SCORE = 10;
    private const MAX_PROMPT = 12000;
    public static function create(string $uuid): void
    {
        Request::post();
        Identity::required();
        $uuid = trim($uuid);
        if (!Validate::required($uuid)) {
            Response::badRequest('Missing article uuid');
        }
        $post = self::loadArticle($uuid);
        if ($post === null) {
            return;
        }
        $title = trim((string) ($post['title'] ?? 'Article'));
        $prompt = trim((string) Request::value('prompt'));
        if ($prompt === '') {
            $prompt = $title;
        }
        if (!Validate::required($prompt)) {
            Response::badRequest('Missing prompt');
        }
        if (mb_strlen($prompt) > self::MAX_PROMPT) {
            Response::badRequest('Prompt is too long');
        }
        $templateId = self::parseTemplateId(Request::value('template_id'));
        $postIds = self::parsePostIds(Request::value('post_ids') ?? Request::value('article_ids'));
        self::beginLongRequest();
        try {
            $source = self::generateFromSources(
                $uuid,
                $prompt,
                $title,
                $templateId,
                $postIds
            );
            self::finishLongRequest([
                'source' => $source,
                'template_id' => $templateId,
            ]);
        } catch (\Throwable $exception) {
            self::finishLongRequest(
                $exception->getMessage() ?: 'Article generation failed',
                500
            );
        }
    }
    private static function beginLongRequest(): void
    {
        @set_time_limit(0);
        ignore_user_abort(true);
        @ini_set('max_execution_time', '0');
        if (function_exists('apache_setenv')) {
            @apache_setenv('no-gzip', '1');
        }
        @ini_set('zlib.output_compression', '0');
        while (ob_get_level() > 0) {
            @ob_end_flush();
        }
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('X-Accel-Buffering: no');
        header('Content-Encoding: identity');
        echo str_repeat("\n", 4);
        @flush();
        Client::onWait(static function (): void {
            echo "\n";
            @flush();
        });
    }
    private static function finishLongRequest(array|string $content, int $code = 200): never
    {
        Client::onWait(null);
        if (!headers_sent()) {
            if ($code >= 400) {
                Response::error($content);
            }
            Response::success(is_array($content) ? $content : ['message' => (string) $content]);
        }
        http_response_code($code);
        if ($code >= 400) {
            $message = is_array($content)
                ? (string) ($content['message'] ?? $content['error'] ?? 'Request failed')
                : (string) $content;
            echo json_encode(
                [
                    'success' => false,
                    'message' => $message,
                ],
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            );
            exit;
        }
        echo json_encode($content, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    private static function loadArticle(string $uuid): ?array
    {
        $post = Query::fetch(
            "SELECT p.id, p.user_id, p.uuid, p.title, p.status
            FROM ielectro_dyscover.dyscover_posts p
            WHERE p.uuid = ?
            AND p.type = 'article'
            LIMIT 1",
            [$uuid]
        );
        if (!$post || $post['status'] !== 'active') {
            Response::notFound('Article not found');
            return null;
        }
        if (!self::isOwner((int) $post['user_id'])) {
            Response::forbidden();
            return null;
        }
        return $post;
    }
    private static function parseTemplateId(mixed $value): ?int
    {
        if ($value === null || $value === false || $value === '') {
            return null;
        }
        $id = (int) $value;
        return $id > 0 ? $id : null;
    }
    private static function parsePostIds(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $ids = [];
        foreach ($value as $item) {
            $id = (int) $item;
            if ($id > 0) {
                $ids[$id] = $id;
            }
        }
        return array_slice(array_values($ids), 0, 12);
    }
    private static function generateFromSources(
        string $uuid,
        string $prompt,
        string $title,
        ?int $templateId,
        array $postIds
    ): string {
        $posts = ArticleKnowledge::postsByIds($postIds, $uuid);
        $knowledge = ArticleKnowledge::loadAttachedKnowledge(
            $posts,
            $prompt . "\n" . $title,
            12000
        );
        $corpus = (string) ($knowledge['corpus'] ?? '');
        $links = is_array($knowledge['links'] ?? null) ? $knowledge['links'] : [];
        $media = is_array($knowledge['media'] ?? null) ? $knowledge['media'] : [];
        $template = null;
        $templateBlock = '';
        if ($templateId !== null) {
            $template = ArticleKnowledge::templateById($templateId);
            if ($template === null) {
                throw new \RuntimeException('Template not found');
            }
            Client::pause();
            $templateBlock = self::buildTemplateBlock(
                $template,
                ['summary' => $prompt],
                $links,
                $media,
                [],
                $title,
                $title
            );
        }
        Client::pause();
        $body = self::writeBody($prompt, $title, $corpus, $links, $media);
        $source = self::assembleSource($templateBlock, $body);
        $source = self::stripMainTitle($source, $title);
        if ($template === null) {
            $source = self::stripTemplateBlocks($source);
        } else {
            $source = self::ensureTemplateFirst($source);
        }
        $source = ArticleKnowledge::sanitizeSource($source, $links, $media);
        return trim($source);
    }
    private static function writeBody(
        string $prompt,
        string $title,
        string $corpus,
        array $links,
        array $media = []
    ): string {
        $linkBlock = ArticleKnowledge::formatLinkCatalog($links, 18);
        $mediaBlock = ArticleKnowledge::formatMediaCatalogGrouped($media, 16);
        $dictionary = ArticleKnowledge::formatElementsDictionary();
        $outlineText = self::planStrictOutline($prompt, $title, $corpus);
        $corpusBlock = $corpus !== ''
            ? "Attached posts (search these HTML/text extracts for facts, names, dates, images, and links; prefer this material over invention):\n{$corpus}\n\n"
            : "No attached posts. Write only from the author's source text.\n\n";
        $messages = [
            ['role' => 'system', 'content' => self::bodySystemPrompt()],
            [
                'role' => 'user',
                'content' => "Page title (already shown — NEVER output as # heading): {$title}\n\n"
                    . "Author source text (this is the material to turn into the article):\n{$prompt}\n\n"
                    . $corpusBlock
                    . "Verified article links from attached posts:\n{$linkBlock}\n\n"
                    . "Verified media from attached posts and imported article HTML:\n{$mediaBlock}\n\n"
                    . "Required outline (follow exactly this # / ## order):\n{$outlineText}\n\n"
                    . $dictionary
                    . "\n\nWrite the article body ONLY (no {{template}}). Use attached HTML extracts when they contain what the source text needs. Follow the required outline strictly.",
            ],
        ];
        $source = trim(self::cleanSource(Client::chat($messages, 0.5, 8192)));
        for ($attempt = 0; $attempt < 1 && self::needsStyleRepair($source); $attempt++) {
            Client::pause();
            $source = self::repairStyle($source, $title, $links, $media, $outlineText);
        }
        $source = self::stripPlaceholderLinks($source);
        $source = self::dedupeParagraphs($source);
        return trim($source);
    }
    private static function planStrictOutline(string $prompt, string $title, string $corpus): string
    {
        $sample = trim($prompt . "\n\n" . mb_substr($corpus, 0, 3000));
        $messages = [
            [
                'role' => 'system',
                'content' => 'Plan a Dyscover article outline. Reply with lines only, using # for sections and ## for subsections. '
                    . 'At least 2 top-level # headings. Each # heading must have at least 2 ## subsections. '
                    . 'No prose, no numbering, no JSON.',
            ],
            [
                'role' => 'user',
                'content' => "Title: {$title}\n\nTopic/source text:\n{$sample}\n\n"
                    . "Return outline lines only.",
            ],
        ];
        $raw = self::cleanSource(Client::chat($messages, 0.2, 450));
        $normalized = self::normalizeOutlineLines($raw);
        if ($normalized !== '') {
            return $normalized;
        }
        return "# Office\n## Constitutional Role\n## Cabinet Leadership\n# Powers and Functions\n## Domestic Governance\n## Foreign Policy\n# Appointment and Tenure\n## Selection Process\n## Accountability and Removal";
    }
    private static function normalizeOutlineLines(string $text): string
    {
        $lines = preg_split("/\r\n|\n|\r/", $text) ?: [];
        $out = [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            if (preg_match('/^#{1,2}\s+.+$/', $line)) {
                $out[] = preg_replace('/\s+/', ' ', $line) ?? $line;
            }
        }
        if (!$out) {
            return '';
        }
        return implode("\n", $out);
    }
    private static function relatedSearchTags(string $primaryEntity, array $relatedTags): array
    {
        $entity = mb_strtolower(trim($primaryEntity));
        $extra = ['politics', 'government'];
        if ($entity === 'destenia' || str_contains($entity, 'desten')) {
            $extra = array_merge($extra, [
                'politicalparty',
                'revolutionaries',
                'massorganization',
                'destenia',
            ]);
        }
        return array_values(array_unique(array_merge($relatedTags, $extra)));
    }
    private static function buildResearchContext(
        string $uuid,
        string $prompt,
        string $title,
        ?int $templateId = null
    ): array {
        $topic = ArticleKnowledge::extractTopicTerms($prompt, $title);
        $terms = $topic['terms'];
        $relatedTags = is_array($topic['related_tags'] ?? null) ? $topic['related_tags'] : [];
        $terms = array_values(array_unique(array_merge($terms, $relatedTags)));
        if (!empty($topic['political_party'])) {
            $terms[] = mb_strtolower((string) $topic['political_party']);
            $terms = array_values(array_unique($terms));
        }
        $primaryEntity = self::normalizeScalar($topic['primary_entity'] ?? '');
        $archetype = $topic['archetype'];
        $playbook = ArticlePlaybook::match($prompt, $title, $terms, $archetype);
        $articles = ArticleKnowledge::searchRelatedArticles(
            $terms,
            $primaryEntity,
            $archetype,
            $uuid,
            12,
            self::relatedSearchTags($primaryEntity, $relatedTags)
        );
        $links = ArticleKnowledge::filterLinksForTopic(
            array_values(array_filter(
                $articles,
                static fn(array $row): bool => ($row['type'] ?? '') === 'article' && !empty($row['url'])
            )),
            $primaryEntity,
            $title
        );
        $media = ArticleKnowledge::searchBodyMedia(
            $terms,
            $primaryEntity,
            $archetype,
            $uuid,
            16
        );
        $media = ArticleKnowledge::appendPortraitMedia($media, $terms, $primaryEntity, $uuid, $title);
        $media = ArticleKnowledge::filterMediaForTopic($media, $primaryEntity, $title);
        $corpus = ArticleKnowledge::loadArticleCorpus($articles, 4500);
        Client::pause();
        $facts = self::extractFacts($prompt, $title, $corpus, $topic);
        $referenceOutline = ArticleKnowledge::extractReferenceOutline($articles);
        Client::pause();
        $outline = self::planOutline($prompt, $title, $facts, $playbook, $referenceOutline);
        $template = null;
        $templateBlock = '';
        if ($templateId !== null) {
            $template = ArticleKnowledge::templateById($templateId);
            if ($template === null) {
                throw new \RuntimeException('Template not found');
            }
            Client::pause();
            $templateBlock = self::buildTemplateBlock(
                $template,
                $facts,
                $links,
                $media,
                $terms,
                $primaryEntity,
                $title
            );
        }
        return [
            'topic' => $topic,
            'terms' => $terms,
            'primary_entity' => $primaryEntity,
            'archetype' => $archetype,
            'playbook_id' => $playbook['id'] ?? null,
            'articles' => self::compactReferences($articles),
            'links' => self::compactLinks($links),
            'media' => self::compactMedia($media),
            'facts' => $facts,
            'outline' => $outline,
            'template' => $template,
            'template_id' => $template !== null ? (int) $template['id'] : null,
            'template_block' => $templateBlock,
        ];
    }
    private static function respondWrite(string $uuid, string $prompt, string $title, array $context): void
    {
        $topic = is_array($context['topic'] ?? null) ? $context['topic'] : [];
        $terms = is_array($context['terms'] ?? null) ? $context['terms'] : [];
        $primaryEntity = (string) ($context['primary_entity'] ?? '');
        $facts = is_array($context['facts'] ?? null) ? $context['facts'] : [];
        $outline = is_array($context['outline'] ?? null) ? $context['outline'] : [];
        $links = ArticleKnowledge::filterLinksForTopic(
            self::expandLinks($context['links'] ?? []),
            $primaryEntity,
            $title
        );
        $media = ArticleKnowledge::filterMediaForTopic(
            self::expandMedia($context['media'] ?? []),
            $primaryEntity,
            $title
        );
        $template = is_array($context['template'] ?? null) ? $context['template'] : null;
        $templateBlock = trim((string) ($context['template_block'] ?? ''));
        Client::pause();
        $body = self::generateBody(
            $prompt,
            $title,
            $facts,
            $outline,
            $links,
            $media,
            $terms,
            $primaryEntity
        );
        $source = self::postProcessSource(
            self::assembleSource($templateBlock, $body),
            $title,
            $template,
            $links,
            $media
        );
        $playbookId = (string) ($context['playbook_id'] ?? '');
        if ($playbookId !== '') {
            ArticlePlaybook::recordSuccess($playbookId, $terms, $outline);
        } elseif (!empty($topic['archetype']) && ($topic['archetype'] ?? '') !== 'other') {
            ArticlePlaybook::createFromGeneration((string) $topic['archetype'], $terms, $outline);
        }
        self::finishLongRequest([
            'stage' => 'write',
            'source' => $source,
            'template_id' => $template !== null ? (int) ($template['id'] ?? 0) : null,
            'archetype' => (string) ($topic['archetype'] ?? ''),
            'terms' => $terms,
            'references' => $context['articles'] ?? [],
        ]);
    }
    private static function compactReferences(array $articles): array
    {
        return array_map(
            static fn(array $ref): array => [
                'id' => $ref['id'],
                'uuid' => $ref['uuid'],
                'type' => $ref['type'],
                'title' => $ref['title'],
            ],
            $articles
        );
    }
    private static function compactLinks(array $links): array
    {
        return array_map(
            static fn(array $link): array => [
                'title' => $link['title'] ?? '',
                'url' => $link['url'] ?? '',
            ],
            $links
        );
    }
    private static function compactMedia(array $media): array
    {
        return array_map(
            static fn(array $item): array => [
                'title' => $item['title'] ?? '',
                'type' => $item['type'] ?? '',
                'media_url' => $item['media_url'] ?? '',
            ],
            $media
        );
    }
    private static function expandLinks(array $links): array
    {
        $expanded = [];
        foreach ($links as $link) {
            if (!is_array($link) || empty($link['url'])) {
                continue;
            }
            $expanded[] = [
                'title' => (string) ($link['title'] ?? ''),
                'url' => (string) $link['url'],
                'type' => 'article',
            ];
        }
        return $expanded;
    }
    private static function expandMedia(array $media): array
    {
        $expanded = [];
        foreach ($media as $item) {
            if (!is_array($item) || empty($item['media_url'])) {
                continue;
            }
            $expanded[] = [
                'title' => (string) ($item['title'] ?? ''),
                'type' => (string) ($item['type'] ?? 'image'),
                'media_url' => (string) $item['media_url'],
            ];
        }
        return $expanded;
    }
    private static function isOwner(int $postUserId): bool
    {
        $accountId = Identity::id();
        if ($accountId === null) {
            return false;
        }
        $owner = Query::fetch(
            'SELECT id FROM ielectro_dyscover.dyscover_users WHERE account_id = ? LIMIT 1',
            [$accountId]
        );
        return $owner && (int) $owner['id'] === $postUserId;
    }
    private static function extractFacts(string $prompt, string $title, string $corpus, array $topic): array
    {
        $raw = Client::chat([
            [
                'role' => 'system',
                'content' => 'Extract encyclopedic facts as JSON only: '
                    . '{"official_name":"","summary":"","mandate":"","term_length":"","incumbent":"","party":"","powers":[],"history":[],"related_topics":[],"previous_officeholders":[]}. '
                    . 'Use Dyscover corpus when present. If details are missing, infer plausible encyclopedic facts consistent with the source text. '
                    . 'Invent names, dates, and lists when needed. NEVER mention missing data or uncertainty.',
            ],
            [
                'role' => 'user',
                'content' => "Title: {$title}\nSource text: {$prompt}\nPrimary entity: {$topic['primary_entity']}\n\nCorpus:\n{$corpus}",
            ],
        ], 0.2, 600, Client::fastModel());
        if (preg_match('/\{[\s\S]*\}/', $raw, $match)) {
            $json = json_decode($match[0], true);
            if (is_array($json)) {
                return $json;
            }
        }
        return [
            'official_name' => $title,
            'summary' => $prompt,
            'mandate' => '',
            'term_length' => '',
            'incumbent' => '',
            'party' => '',
            'powers' => [],
            'history' => [],
            'related_topics' => $topic['terms'],
            'previous_officeholders' => [],
        ];
    }
    private static function planOutline(
        string $prompt,
        string $title,
        array $facts,
        ?array $playbook,
        array $referenceOutline
    ): array {
        if ($playbook !== null && !empty($playbook['outline'])) {
            return $playbook['outline'];
        }
        if ($referenceOutline !== []) {
            return $referenceOutline;
        }
        $factsJson = json_encode($facts, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
        $raw = Client::chat([
            [
                'role' => 'system',
                'content' => 'Plan a long Wikipedia-style article outline. Reply ONLY JSON: '
                    . '[{"heading":"Section","subsections":["Sub A","Sub B"]}] with 6-10 major sections.',
            ],
            [
                'role' => 'user',
                'content' => "Title: {$title}\nSource text: {$prompt}\nFacts: {$factsJson}",
            ],
        ], 0.2, 600, Client::fastModel());
        if (preg_match('/\[[\s\S]*\]/', $raw, $match)) {
            $json = json_decode($match[0], true);
            if (is_array($json) && $json !== []) {
                return $json;
            }
        }
        return [
            ['heading' => 'Overview', 'subsections' => ['Role', 'Institutional context']],
            ['heading' => 'History', 'subsections' => ['Origins', 'Modern period']],
            ['heading' => 'Powers and duties', 'subsections' => ['Executive', 'Protocol']],
            ['heading' => 'See also', 'subsections' => []],
            ['heading' => 'References', 'subsections' => []],
        ];
    }
    private static function pickAndValidateTemplate(
        string $prompt,
        string $title,
        array $templates,
        ?array $playbook,
        array $topic
    ): ?array {
        if ($templates === []) {
            return null;
        }
        $candidates = array_slice($templates, 0, 5);
        if ($playbook !== null) {
            $avoid = $playbook['template']['avoid_title_keywords'] ?? [];
            $candidates = array_values(array_filter(
                $candidates,
                static function (array $template) use ($avoid): bool {
                    $titleLower = mb_strtolower((string) ($template['title'] ?? ''));
                    foreach ($avoid as $word) {
                        if ($word !== '' && str_contains($titleLower, mb_strtolower((string) $word))) {
                            return false;
                        }
                    }
                    return true;
                }
            ));
        }
        if ($candidates === []) {
            return null;
        }
        $lines = [];
        foreach ($candidates as $template) {
            $fieldNames = array_map(
                static fn(array $field): string => $field['slug'] . ' (' . $field['name'] . ' [' . $field['type'] . '])',
                $template['fields']
            );
            $lines[] = 'ID ' . $template['id'] . ' (score ' . (int) ($template['score'] ?? 0) . '): "'
                . $template['title'] . '" — fields: ' . implode(', ', $fieldNames);
        }
        $raw = Client::chat([
            [
                'role' => 'system',
                'content' => 'Validate whether a Dyscover infobox template fits the article topic by FIELD names, not just title. '
                    . 'For a president/office article, reject country templates (population, GDP, demonym, map). '
                    . 'Reply ONLY JSON: {"template_id":123,"valid":true} or {"template_id":null,"valid":false}.',
            ],
            [
                'role' => 'user',
                'content' => "Article: {$title}\nBrief: {$prompt}\nArchetype: {$topic['archetype']}\n\nTemplates:\n"
                    . implode("\n", $lines),
            ],
        ], 0.05, 120, Client::fastModel());
        $templateId = null;
        $valid = false;
        if (preg_match('/\{[\s\S]*\}/', $raw, $match)) {
            $json = json_decode($match[0], true);
            if (is_array($json)) {
                $valid = !empty($json['valid']);
                $templateId = isset($json['template_id']) ? (int) $json['template_id'] : null;
            }
        }
        if (!$valid || $templateId === null) {
            return null;
        }
        $picked = self::findTemplate($candidates, $templateId);
        if ($picked === null || (int) ($picked['score'] ?? 0) < self::MIN_TEMPLATE_SCORE) {
            return null;
        }
        return $picked;
    }
    private static function resolveInfoboxTitle(string $title, array $facts, string $primaryEntity): string
    {
        $official = self::normalizeScalar($facts['official_name'] ?? '');
        if ($official !== '') {
            return $official;
        }
        return $title !== '' ? $title : $primaryEntity;
    }
    private static function normalizeScalar(mixed $value, string $default = ''): string
    {
        if (is_array($value)) {
            $parts = [];
            foreach ($value as $item) {
                $text = self::normalizeScalar($item);
                if ($text !== '') {
                    $parts[] = $text;
                }
            }
            return $parts !== [] ? implode(', ', $parts) : $default;
        }
        if (is_bool($value)) {
            return $value ? 'yes' : 'no';
        }
        if ($value === null) {
            return $default;
        }
        return trim((string) $value);
    }
    private static function normalizeTemplateFieldValue(mixed $value): string
    {
        if (is_array($value)) {
            $lines = [];
            foreach ($value as $item) {
                if (is_array($item)) {
                    $parts = array_values(array_filter(array_map(
                        static fn($part): string => self::normalizeScalar($part),
                        $item
                    )));
                    if ($parts !== []) {
                        $lines[] = implode(' ;; ', $parts);
                    }
                    continue;
                }
                $text = self::normalizeScalar($item);
                if ($text === '') {
                    continue;
                }
                if (
                    str_starts_with($text, '-')
                    || str_starts_with($text, '**')
                    || str_contains($text, '[[')
                    || str_contains($text, '{{')
                ) {
                    $lines[] = $text;
                } else {
                    $lines[] = '- ' . $text;
                }
            }
            return implode("\n", $lines);
        }
        return self::normalizeScalar($value);
    }
    private static function cleanTemplateFieldValue(string $slug, string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return '';
        }
        $slug = mb_strtolower($slug);
        $stripLinks = (bool) preg_match(
            '/formation|term|salary|date|holder|length|instrument|precursor|style|abbreviation|incumbent|deputy|seat|nominator|appointer|reports|unofficial|part-of|type|image|photo|portrait|map|audio|anthem|flag|emblem/',
            $slug
        );
        if ($stripLinks) {
            $value = (string) preg_replace(
                '/\s*\(\[\[[^\]]+\|[^\]]+\]\](?:,\s*\[\[[^\]]+\|[^\]]+\]\])*\)\.?/u',
                '',
                $value
            );
            $value = (string) preg_replace('/\[\[[^\]|]+\|[^\]]+\]\]/u', '', $value);
        }
        return trim((string) preg_replace("/\n{3,}/", "\n\n", $value));
    }
    private static function buildTemplateBlock(
        array $template,
        array $facts,
        array $links,
        array $media,
        array $terms,
        string $primaryEntity,
        string $title
    ): string {
        $fieldValues = self::fillTemplateFields($template, $facts, $links, $media, $terms, $primaryEntity, $title);
        $lines = ['{{template|' . (int) $template['id']];
        $lines[] = '| _title = ' . self::resolveInfoboxTitle($title, $facts, $primaryEntity);
        foreach ($template['fields'] as $field) {
            $slug = (string) ($field['slug'] ?? '');
            if ($slug === '' || $slug === '_title') {
                continue;
            }
            $value = self::cleanTemplateFieldValue($slug, self::normalizeTemplateFieldValue($fieldValues[$slug] ?? ''));
            $mediaValue = self::resolveTemplateFieldMedia($field, $media, $terms, $primaryEntity, $title);
            if ($mediaValue !== '') {
                $value = $mediaValue;
            } elseif ($value === '') {
                continue;
            }
            $lines[] = '| ' . $slug . ' = ' . $value;
        }
        $lines[] = '}}';
        return ArticleKnowledge::sanitizeTemplateBlock(implode("\n", $lines));
    }
    private static function resolveTemplateFieldMedia(
        array $field,
        array $media,
        array $terms,
        string $primaryEntity,
        string $articleTitle = ''
    ): string {
        $type = (string) ($field['type'] ?? 'text');
        $slug = mb_strtolower((string) ($field['slug'] ?? '') . ' ' . (string) ($field['name'] ?? ''));
        if ($type === 'double-image' || str_contains($slug, 'flag') || str_contains($slug, 'emblem')) {
            $pair = ArticleKnowledge::pickMediaPairForField($media, $field, $terms, $primaryEntity, $articleTitle);
            if (is_array($pair) && count($pair) >= 2) {
                return '{{template-double-image|' . $pair[0]['media_url'] . ' ;; ' . $pair[1]['media_url'] . '}}';
            }
            if (is_array($pair) && count($pair) === 1) {
                return self::formatTemplateMediaField($field, (string) $pair[0]['media_url']);
            }
        }
        if (in_array($type, ['single-image', 'large-image', 'double-image'], true) || preg_match('/image|photo|portrait|map|audio|anthem/', $slug)) {
            $picked = ArticleKnowledge::pickMediaForField($media, $field, $terms, $primaryEntity, $articleTitle);
            if ($picked !== null) {
                if (($picked['type'] ?? '') === 'audio' && str_contains($slug, 'anthem')) {
                    return '- ' . ($picked['title'] ?? 'Anthem') . "\n- {{audio|" . ($picked['media_url'] ?? '') . '}}';
                }
                return self::formatTemplateMediaField($field, (string) ($picked['media_url'] ?? ''));
            }
        }
        return '';
    }
    private static function fillTemplateFields(
        array $template,
        array $facts,
        array $links,
        array $media,
        array $terms,
        string $primaryEntity,
        string $title
    ): array {
        $fieldLines = [];
        foreach ($template['fields'] as $field) {
            $fieldLines[] = (string) ($field['slug'] ?? '') . ' (' . ($field['name'] ?? '') . ', type '
                . ($field['type'] ?? 'text') . ')';
        }
        $factsJson = json_encode($facts, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
        $linksBlock = ArticleKnowledge::formatLinkCatalog(
            ArticleKnowledge::filterLinksForTopic($links, $primaryEntity, $title),
            8
        );
        $mediaBlock = ArticleKnowledge::formatMediaCatalog($media, 8);
        $raw = Client::chat([
            [
                'role' => 'system',
                'content' => 'Fill ALL infobox fields with encyclopedic values. Reply ONLY JSON slug=>value for every field listed. '
                    . 'NEVER add [[Label|url]] links in formation, dates, term-length, salary, incumbent, or image fields. '
                    . 'Formation/history fields use plain milestone text only, e.g. Presidential Decree 1957 ;; 9 May 1957. '
                    . 'Use [[Label|url]] links ONLY in institution or office fields when the link title clearly matches '
                    . $primaryEntity . ' or the article topic. If no exact match exists, use plain text. '
                    . 'For image/audio fields leave empty; PHP attaches verified media later. '
                    . 'If a fact is missing, invent plausible values in academic style. NEVER mention missing data. '
                    . 'Use definition syntax: **Section** headers, - bullet lines, ;; for double columns.',
            ],
            [
                'role' => 'user',
                'content' => "Article title: {$title}\nPrimary entity: {$primaryEntity}\nFacts: {$factsJson}\n"
                    . "Verified links:\n{$linksBlock}\nVerified media:\n{$mediaBlock}\n\nFields:\n"
                    . implode("\n", $fieldLines),
            ],
        ], 0.25, 900, Client::fastModel());
        if (!preg_match('/\{[\s\S]*\}/', $raw, $match)) {
            return [];
        }
        $json = json_decode($match[0], true);
        if (!is_array($json)) {
            return [];
        }
        $normalized = [];
        foreach ($json as $slug => $value) {
            $key = self::normalizeScalar($slug);
            if ($key === '') {
                continue;
            }
            $normalized[$key] = self::normalizeTemplateFieldValue($value);
        }
        return $normalized;
    }
    private static function formatTemplateMediaField(array $field, string $url): string
    {
        $type = (string) ($field['type'] ?? 'single-image');
        $slug = mb_strtolower((string) ($field['slug'] ?? '') . ' ' . (string) ($field['name'] ?? ''));
        $url = trim($url);
        if ($url === '') {
            return '';
        }
        if (str_contains($slug, 'map') || $type === 'large-image') {
            return '{{template-large-image|' . $url . '}}';
        }
        if ($type === 'double-image') {
            return '{{template-double-image|' . $url . '}}';
        }
        return '{{template-single-image|' . $url . '}}';
    }
    private static function generateBody(
        string $prompt,
        string $title,
        array $facts,
        array $outline,
        array $links,
        array $media,
        array $terms,
        string $primaryEntity
    ): string {
        $links = ArticleKnowledge::filterLinksForTopic($links, $primaryEntity, $title);
        $media = ArticleKnowledge::filterMediaForTopic($media, $primaryEntity, $title);
        $outlineText = self::formatOutlineForPrompt($outline);
        $factsJson = json_encode($facts, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
        $linkBlock = ArticleKnowledge::formatLinkCatalog($links, 14);
        $mediaBlock = ArticleKnowledge::formatMediaCatalogGrouped($media, 12);
        $dictionary = ArticleKnowledge::formatElementsDictionary();
        $messages = [
            ['role' => 'system', 'content' => self::bodySystemPrompt()],
            [
                'role' => 'user',
                'content' => "Page title (already shown — NEVER output as # heading): {$title}\n\n"
                    . "Author source text (expand this into the article; keep its facts, names, dates, and details; you may reuse wording):\n{$prompt}\n\nFacts JSON:\n{$factsJson}\n\n"
                    . "Required outline (use these # and ## headings in order):\n{$outlineText}\n\n"
                    . "Verified article links:\n{$linkBlock}\n\n"
                    . "Verified media:\n{$mediaBlock}\n\n"
                    . "Primary entity: {$primaryEntity}\n"
                    . "Search terms: " . implode(', ', $terms) . "\n\n"
                    . $dictionary
                    . "\n\nWrite the article body ONLY (no {{template}}). Start with exactly 5 long lead paragraphs, then the outline sections.",
            ],
        ];
        $source = self::cleanSource(Client::chat($messages, 0.55, 4096));
        if (!self::looksValid($source) && !Client::isLocal()) {
            Client::pause();
            $source = self::cleanSource(Client::chat([
                ['role' => 'system', 'content' => self::bodySystemPrompt()],
                [
                    'role' => 'user',
                    'content' => "Expand this draft substantially. Start with exactly 5 long lead paragraphs before any # heading. "
                        . "Each ## subsection needs exactly 5 long paragraphs. "
                        . "Add **bold** terms and [[Label|url]] links ONLY when the linked article clearly matches "
                        . "the same country/topic as this page. Never append parenthetical link lists at sentence ends. "
                        . "Never link unrelated countries. Never put paragraphs directly under # headings. "
                        . "Never mention missing sources.\n\n{$source}",
                ],
            ], 0.35, 4096));
        }
        return trim($source);
    }
    private static function bodySystemPrompt(): string
    {
        return <<<'PROMPT'
You write Dyscover Source article bodies. Output ONLY Dyscover Source markup. No fences. No commentary. No meta-text.
NEVER output {{template|...}} blocks (the template is handled externally).

TONE — Write in a formal, assertive, authoritative Dyscover encyclopedia voice. State facts directly and confidently. Do NOT use neutral Wikipedia hedging ("is considered", "is believed to be", "it is thought that"). The tone is proud, detailed, and declarative. Never say data is missing or unavailable.

ATTACHED SOURCES — Carefully analyze the attached post HTML/text extracts for factual data: names, dates, statistics, links, images, tables. Use this data throughout the article. Prefer attached material over invention. Do not invent sources, media URLs, or facts.

STRUCTURE:
1) Write exactly 5 substantial lead paragraphs BEFORE the first # heading. These introduce the subject broadly. No headings, no images, no media in this section.
2) Then use # and ## headings that fit the source text.
2a) Include at least 2 top-level # headings after the lead.
2b) For each top-level # heading, include at least 2 ## subheadings.
3) If a # heading has ## subheadings, do NOT write paragraphs directly after the # heading. Go straight to the first ## subheading. You may place a > See also: [[link]] blockquote after the # heading before the first ##.
4) If a # heading has NO ## subheadings, write exactly 5 substantial paragraphs under it.
5) Each ## subheading must have approximately 5 substantial paragraphs.
6) End with # See also (bullet list of [[links]]) and # References when attached sources provide them.

PARAGRAPHS — Each paragraph must be 5-8 sentences long, dense with facts. Write each paragraph as one continuous line with a blank line between paragraphs. Never repeat a phrase, name, or concept already stated in an earlier paragraph. Do not re-explain what was already covered.

BOLD — Use exactly 7 **bold** keywords per paragraph. Bold individual key WORDS or short terms (1-3 words), not long phrases. Never bold across a comma — if a list has commas, bold each item separately: "**national agenda**, **setting priorities**, **government oversight**", NOT "**national agenda, setting priorities, government oversight**". If a bold span contains a comma, split it into separate bold keywords.

LINKS — Use [[Label|url]] ONLY from the verified attached-post link catalog. Whenever a bold term matches an attached link, use the link form instead. If no matching attached link exists, keep the term as **bold** text only. Never invent URLs and NEVER output placeholder URLs like [[...|URL]].

MEDIA:
- Use {{image|url|caption}}, {{video|url}}, or {{audio|url}} ONLY with verified URLs from the attached media catalog.
- Place one image after each # or ## heading line (not before it, not inside paragraphs).
- Do NOT place any image, video, or audio before or within the 5 lead paragraphs. The first media appears after the first # heading.
- Never invent media URLs.

TABLES — Use | table | rows when the attached HTML contains comparable tabular data. Use {{icon-image|url}} inside table cells when icon images are available. Use {{percent|...}} and {{legend|...}} elements ONLY inside {{template|...}} blocks or | table | rows, never in free-text paragraphs.

ANTI-REPETITION — Never repeat the same sentence, claim, or wording across paragraphs or sections. Each paragraph must add new information. If two paragraphs are semantically similar, rewrite the second one with new facts.

STRICT ENDING RULES:
- Output # See also ONLY if at least 2 verified links are available from the provided catalog.
- Output # References ONLY if real verified sources/doc links are available.
- If verified links/sources are missing, omit those sections entirely.

FORMATTING:
- **Bold** and *italic*
- - bullet lists and 1. numbered lists where useful
- Long paragraphs: one continuous line, blank line between blocks
- Do not copy attached corpus verbatim; synthesize and expand

STYLE REFERENCE — Here is how a well-written Dyscover article looks (lead paragraphs, then first heading):

**Destenia**, officially the **Destenian Republic**, is a country located in **southern Edrobe** and is **Edrobe's largest country**. It operates as a [[unitary semi-presidential republic|URL]] with **Distinia** as capital city. **Destenia** is bordered by [[Agaritia|URL]] to the north-east and [[Laocitia|URL]] to the north-west along its land frontiers. By sea, it is bordered by [[Alveria|URL]] to the north-west, [[Cavallesia|URL]] to the east, [[Kashiria|URL]] to the west, [[Lamberia|URL]] to the south, and [[Stasia|URL]] to the south-west.

Destenia is a **member** of the [[United Nations|URL]], the [[Edrobean Community|URL]], and other **international organizations** such as the **Global Reserve Fund**, **World Trade Network**, and **International Energy Agency**. As a **global power**, it is maintaining a non-aligned foreign policy based on multilateralism, sovereignty, and strategic economic integration.

# Etymology

The etymology of **Destenia** derives from ancient Destenian linguistic roots, where the word *"Destino"* signified **future, fate, or course of life**, and the suffix -nia denoted **land, realm, or community**. Combined, the term was understood as the **"Land of Destinies"**, a poetic reflection of a people who believed themselves bound to a bright collective future.

FINAL SELF-CHECK (silent, do not print): before returning, verify every paragraph has exactly 7 bold keywords, no placeholder URL tokens, no duplicate paragraphs, and heading/subheading rules are satisfied.

Notice: heavy bold usage, [[links]] from catalog, assertive tone, 5+ paragraphs per section, image after heading not before.
PROMPT;
    }
    private static function formatOutlineForPrompt(array $outline): string
    {
        $lines = [];
        foreach ($outline as $section) {
            if (!is_array($section)) {
                continue;
            }
            $heading = trim((string) ($section['heading'] ?? ''));
            if ($heading === '') {
                continue;
            }
            $lines[] = '# ' . $heading;
            foreach (($section['subsections'] ?? []) as $sub) {
                $sub = trim((string) $sub);
                if ($sub !== '') {
                    $lines[] = '## ' . $sub;
                }
            }
        }
        return implode("\n", $lines);
    }
    private static function assembleSource(string $templateBlock, string $body): string
    {
        $templateBlock = trim($templateBlock);
        $body = trim($body);
        if ($templateBlock === '') {
            return $body;
        }
        return $body === '' ? $templateBlock : $templateBlock . "\n\n" . $body;
    }
    private static function findTemplate(array $templates, ?int $templateId): ?array
    {
        if ($templateId === null) {
            return null;
        }
        foreach ($templates as $template) {
            if ((int) $template['id'] === $templateId) {
                return $template;
            }
        }
        return null;
    }
    private static function postProcessSource(
        string $source,
        string $title,
        ?array $template,
        array $links,
        array $media
    ): string {
        $source = trim($source);
        $source = self::stripMainTitle($source, $title);
        $source = ArticleKnowledge::finalizeSource($source, $links, $media, $title, $title);
        if ($template === null) {
            $source = self::stripTemplateBlocks($source);
        } else {
            $source = self::ensureTemplateFirst($source);
        }
        return trim($source);
    }
    private static function stripMainTitle(string $source, string $title): string
    {
        $quoted = preg_quote(trim($title), '/');
        if ($quoted !== '') {
            $source = preg_replace('/^#\s+' . $quoted . '\s*\n+/iu', '', $source) ?? $source;
        }
        return preg_replace('/^#\s+.+\n+/u', '', $source, 1) ?? $source;
    }
    private static function stripTemplateBlocks(string $source): string
    {
        return trim((string) preg_replace('/\{\{template\|\d+[\s\S]*?\n\}\}\s*/i', '', $source));
    }
    private static function ensureTemplateFirst(string $source): string
    {
        if (!preg_match('/\{\{template\|\d+[\s\S]*?\n\}\}/i', $source, $match)) {
            return $source;
        }
        $block = trim($match[0]);
        if (str_starts_with(trim($source), '{{template|')) {
            return $source;
        }
        $position = strpos($source, $match[0]);
        if ($position === false) {
            return $source;
        }
        $rest = trim(substr($source, 0, $position) . substr($source, $position + strlen($match[0])));
        return $rest === '' ? $block : $block . "\n\n" . $rest;
    }
    private static function cleanSource(string $source): string
    {
        $source = trim($source);
        $source = preg_replace('/^```[\w]*\s*\n?/m', '', $source) ?? $source;
        $source = preg_replace('/\n?```\s*$/m', '', $source) ?? $source;
        return trim($source);
    }
    private static function needsStyleRepair(string $source): bool
    {
        if ($source === '') {
            return true;
        }
        if (str_contains($source, '|URL]]')) {
            return true;
        }
        $bold = preg_match_all('/\*\*[^*]+\*\*/', $source);
        if ($bold < 18) {
            return true;
        }
        $sections = preg_match_all('/^#\s+/m', $source);
        if ($sections < 2) {
            return true;
        }
        $paragraphs = preg_split('/\n\s*\n/', $source) ?: [];
        $seen = [];
        foreach ($paragraphs as $paragraph) {
            $line = trim((string) $paragraph);
            if ($line === '' || str_starts_with($line, '#') || str_starts_with($line, '{{')) {
                continue;
            }
            $key = mb_strtolower(preg_replace('/\s+/', ' ', $line) ?? $line);
            if (isset($seen[$key])) {
                return true;
            }
            $seen[$key] = true;
        }
        return false;
    }
    private static function repairStyle(
        string $draft,
        string $title,
        array $links,
        array $media,
        string $outlineText
    ): string
    {
        $linkBlock = ArticleKnowledge::formatLinkCatalog($links, 18);
        $mediaBlock = ArticleKnowledge::formatMediaCatalogGrouped($media, 16);
        $messages = [
            ['role' => 'system', 'content' => self::bodySystemPrompt()],
            [
                'role' => 'user',
                'content' => "Rewrite this draft into stricter Dyscover style.\n"
                    . "MANDATORY fixes:\n"
                    . "- Keep all factual content but remove repetition.\n"
                    . "- Use exactly 7 bold keywords per paragraph (short terms only).\n"
                    . "- Never output placeholder links like [[...|URL]].\n"
                    . "- Keep 5 lead paragraphs before first heading.\n"
                    . "- Follow this exact heading order:\n{$outlineText}\n"
                    . "- Prefer heading names like # Office, # Powers and Functions, # Appointment and Tenure when relevant.\n"
                    . "- Do not place paragraphs directly below a # heading that has ## subheadings.\n"
                    . "- Use media only from verified catalog.\n\n"
                    . "Page title: {$title}\n\n"
                    . "Verified links:\n{$linkBlock}\n\n"
                    . "Verified media:\n{$mediaBlock}\n\n"
                    . "Draft to rewrite:\n{$draft}",
            ],
        ];
        return trim(self::cleanSource(Client::chat($messages, 0.3, 4096)));
    }
    private static function stripPlaceholderLinks(string $source): string
    {
        $source = preg_replace('/\[\[[^\]]+\|URL\]\]/i', '', $source) ?? $source;
        $source = preg_replace('/^\s*-\s*\[\[[^\]]*\|URL\]\]\s*$/im', '', $source) ?? $source;
        $lines = preg_split("/\r\n|\n|\r/", $source) ?: [];
        $clean = [];
        $skipHeading = false;
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if (preg_match('/^#\s+(See also|References)\s*$/i', $trimmed)) {
                $skipHeading = true;
                continue;
            }
            if ($skipHeading) {
                if (preg_match('/^#\s+/', $trimmed)) {
                    $skipHeading = false;
                } elseif ($trimmed === '' || str_starts_with($trimmed, '-')) {
                    continue;
                }
            }
            $clean[] = $line;
        }
        return trim(implode("\n", $clean));
    }
    private static function dedupeParagraphs(string $source): string
    {
        $chunks = preg_split('/(\r?\n){2,}/', $source) ?: [];
        $seen = [];
        $kept = [];
        foreach ($chunks as $chunk) {
            $trimmed = trim($chunk);
            if ($trimmed === '') {
                continue;
            }
            if (str_starts_with($trimmed, '#') || str_starts_with($trimmed, '##') || str_starts_with($trimmed, '{{')) {
                $kept[] = $trimmed;
                continue;
            }
            $key = mb_strtolower(preg_replace('/\s+/', ' ', $trimmed) ?? $trimmed);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $kept[] = $trimmed;
        }
        return trim(implode("\n\n", $kept));
    }
    private static function looksValid(string $source): bool
    {
        if ($source === '' || mb_strlen($source) < 1200) {
            return false;
        }
        $sections = preg_match_all('/^#\s+/m', $source);
        $subsections = preg_match_all('/^##\s+/m', $source);
        $bold = preg_match_all('/\*\*[^*]+\*\*/', $source);
        if ($sections < 4 || $subsections < 4 || $bold < 20) {
            return false;
        }
        return self::structureLooksValid($source);
    }
    private static function structureLooksValid(string $source): bool
    {
        $lines = preg_split("/\r\n|\n|\r/", $source) ?: [];
        $leadParagraphs = 0;
        $leadDone = false;
        $afterTopHeading = false;
        $inSubsection = false;
        $subsectionParagraphs = 0;
        $subsectionCounts = [];
        foreach ($lines as $line) {
            if (preg_match('/^\{\{template\|/', trim($line))) {
                continue;
            }
            $trimmed = trim($line);
            if (!$leadDone) {
                if (preg_match('/^#\s+/', $trimmed) && !preg_match('/^##\s+/', $trimmed)) {
                    $leadDone = true;
                    if ($leadParagraphs !== 5) {
                        return false;
                    }
                    $afterTopHeading = true;
                    continue;
                }
                if (ArticleKnowledge::isParagraphLine($line)) {
                    $leadParagraphs++;
                }
                continue;
            }
            if (preg_match('/^#\s+/', $trimmed) && !preg_match('/^##\s+/', $trimmed)) {
                if ($inSubsection) {
                    $subsectionCounts[] = $subsectionParagraphs;
                }
                $afterTopHeading = true;
                $inSubsection = false;
                $subsectionParagraphs = 0;
                continue;
            }
            if (preg_match('/^##\s+/', $trimmed)) {
                if ($inSubsection) {
                    $subsectionCounts[] = $subsectionParagraphs;
                }
                $afterTopHeading = false;
                $inSubsection = true;
                $subsectionParagraphs = 0;
                continue;
            }
            if ($afterTopHeading && ArticleKnowledge::isParagraphLine($line)) {
                return false;
            }
            if ($inSubsection && ArticleKnowledge::isParagraphLine($line)) {
                $subsectionParagraphs++;
            }
        }
        if ($inSubsection) {
            $subsectionCounts[] = $subsectionParagraphs;
        }
        if (!$leadDone || $leadParagraphs !== 5) {
            return false;
        }
        foreach ($subsectionCounts as $count) {
            if ($count < 4) {
                return false;
            }
        }
        return true;
    }
}
