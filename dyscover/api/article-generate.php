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

    public static function create(string $uuid): void
    {
        Request::post();
        Identity::required();

        @set_time_limit(240);

        $uuid = trim($uuid);
        if (!Validate::required($uuid)) {
            Response::badRequest('Missing article uuid');
        }

        $prompt = trim((string) Request::value('prompt'));
        if (!Validate::required($prompt)) {
            Response::badRequest('Missing prompt');
        }
        if (mb_strlen($prompt) > 4000) {
            Response::badRequest('Prompt is too long');
        }

        $post = self::loadArticle($uuid);
        if ($post === null) {
            return;
        }

        $title = trim((string) ($post['title'] ?? 'Article'));
        $stage = trim((string) Request::value('stage'));

        try {
            if ($stage === 'write') {
                $context = Request::value('context');
                if (!is_array($context)) {
                    Response::badRequest('Missing generation context');
                }
                self::respondWrite($uuid, $prompt, $title, $context);

                return;
            }

            $context = self::buildResearchContext($uuid, $prompt, $title);

            if ($stage === 'research') {
                Response::success([
                    'stage' => 'research',
                    'context' => $context,
                ]);

                return;
            }

            self::respondWrite($uuid, $prompt, $title, $context);
        } catch (\Throwable $exception) {
            Response::error($exception->getMessage() ?: 'Article generation failed');
        }
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

    private static function buildResearchContext(string $uuid, string $prompt, string $title): array
    {
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

        $templates = ArticleKnowledge::rankedTemplates($prompt, $title, 6);
        Client::pause();
        $template = self::pickAndValidateTemplate($prompt, $title, $templates, $playbook, $topic);
        Client::pause();
        $templateBlock = $template !== null
            ? self::buildTemplateBlock($template, $facts, $links, $media, $terms, $primaryEntity, $title)
            : '';

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

        Response::success([
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
                    . 'Use Dyscover corpus when present. If details are missing, infer plausible encyclopedic facts consistent with the brief. '
                    . 'Invent names, dates, and lists when needed. NEVER mention missing data or uncertainty.',
            ],
            [
                'role' => 'user',
                'content' => "Title: {$title}\nBrief: {$prompt}\nPrimary entity: {$topic['primary_entity']}\n\nCorpus:\n{$corpus}",
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
                'content' => "Title: {$title}\nBrief: {$prompt}\nFacts: {$factsJson}",
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
                    . "Brief:\n{$prompt}\n\nFacts JSON:\n{$factsJson}\n\n"
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

        if (!self::looksValid($source)) {
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
You write encyclopedic Dyscover Source article bodies. Output ONLY Dyscover Source. No fences. No commentary.

NEVER output {{template|...}} blocks.

Tone:
- Formal academic encyclopedia voice
- NEVER say data is missing, not provided, not specified, unknown, or unavailable
- If lists/tables/history are missing, invent plausible names, dates, and rows in consistent style

Structure:
1) Exactly 5 long lead paragraphs first (NO headings, NO media, NO lists yet)
2) Then follow the required outline with # and ## headings
3) A # heading NEVER has paragraphs directly beneath it — only ## subsections follow
4) EVERY ## subsection must contain exactly 5 long paragraphs
5) End with # See also as bullet links and # References when useful

Bold rules:
- Use **bold** very heavily: 5-10 bold terms per paragraph
- Bold country names, institutions, offices, key concepts, numbers, and proper nouns

Link rules (critical):
- Use ONLY verified [[Label|url]] links from the catalog when the linked article is clearly about the SAME country, office, or institution as this page
- Link naturally inside sentences when the topic is already mentioned — never force unrelated links
- NEVER append parenthetical link lists like "( [[Topic|url]], [[Other|url]] )." at the end of sentences or fields
- If no relevant verified link exists for a mention, keep plain **bold** text — do NOT link to a different country or unrelated topic
- For office articles (president, prime minister, minister), link the country, constitution, parliament, and related offices of the SAME country only

Topic focus:
- Write strictly about the page title subject: powers, institutions, selection, history, and officeholder tables for that exact office and country
- Do not discuss unrelated countries unless comparing briefly with a relevant verified link

Media rules (outside template):
- NEVER place media before the first # or ## heading
- After a ## heading, add {{image|verified-url|caption}} when a verified image fits
- Use {{image-table|url}} inside table cells for people, ministers, flags, officials
- Use {{icon-image|url}} beside country or entity names in tables
- Prefer using many verified media across sections when titles match the topic

Links:
- Use ONLY verified [[Label|url]] links from the catalog
- Never write "click here", "to learn more", or "for more information"

See also:
- Before some major ## sections you MAY use a standalone caption line: > See also: [[Topic|url]]
- The final # See also section MUST be a bullet list only:
  - [[Topic|url]]
  - [[Topic|url]]
- Do NOT use caption blocks inside # See also

Formatting (use abundantly):
- **Bold** and *italic*
- - bullet lists and 1. numbered lists in every major section
- | tables | in at least 3 sections, including historical officeholder tables when relevant
- {{percent|50%}} and {{legend|#008000|Label}} when useful
- Long paragraphs: one continuous line, 100-180 words, blank line between blocks

Do not copy corpus text verbatim. Write original detailed prose at Wikipedia country/office article scale.
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
