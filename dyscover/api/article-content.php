<?php
namespace Dyscover;
class ArticleContent
{
    public static function extractCoverImage(string $html): string
    {
        if (preg_match(
            '/<img\b[^>]*\bclass="[^"]*\barticle-image\b[^"]*"[^>]*\bsrc="([^"]+)"/i',
            $html,
            $match
        )) {
            return self::decode($match[1]);
        }
        if (preg_match(
            '/<img\b[^>]*\bsrc="([^"]+)"[^>]*\bclass="[^"]*\barticle-image\b/i',
            $html,
            $match
        )) {
            return self::decode($match[1]);
        }
        return '';
    }
    public static function extractFirstParagraph(string $html): string
    {
        if (preg_match(
            '/<p\b[^>]*\bclass="[^"]*\bparagraph\b[^"]*"[^>]*>(.*?)<\/p>/is',
            $html,
            $match
        )) {
            return trim($match[1]);
        }
        if (preg_match('/<p\b[^>]*>(.*?)<\/p>/is', $html, $match)) {
            return trim($match[1]);
        }
        return '';
    }
    public static function extractPlainText(string $html, int $maxLength = 8000): string
    {
        $html = preg_replace('/<script\b[^>]*>.*?<\/script>/is', '', $html) ?? $html;
        $html = preg_replace('/<style\b[^>]*>.*?<\/style>/is', '', $html) ?? $html;
        $html = preg_replace('/<figure\b[^>]*>.*?<\/figure>/is', ' ', $html) ?? $html;
        $html = preg_replace('/<img\b[^>]*>/i', ' ', $html) ?? $html;
        $html = preg_replace('/<\/(p|h2|h3|li|tr)>/i', "$0\n", $html) ?? $html;
        $text = strip_tags($html);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/[ \t]+/u', ' ', $text) ?? $text;
        $text = preg_replace("/\n{3,}/", "\n\n", $text) ?? $text;
        $text = trim($text);
        if ($maxLength > 0 && mb_strlen($text) > $maxLength) {
            $text = mb_substr($text, 0, $maxLength) . '…';
        }
        return $text;
    }
    public static function extractOutline(string $html): array
    {
        $outline = [];
        if (!preg_match_all(
            '/<h2\b[^>]*\bclass="[^"]*\bheading\b[^"]*"[^>]*>(.*?)<\/h2>/is',
            $html,
            $headings
        )) {
            return $outline;
        }
        foreach ($headings[1] as $headingHtml) {
            $heading = trim(strip_tags(html_entity_decode($headingHtml, ENT_QUOTES | ENT_HTML5, 'UTF-8')));
            if ($heading === '') {
                continue;
            }
            $outline[] = [
                'heading' => $heading,
                'subsections' => [],
            ];
        }
        if (preg_match_all(
            '/<h3\b[^>]*\bclass="[^"]*\bsub-heading\b[^"]*"[^>]*>(.*?)<\/h3>/is',
            $html,
            $subs
        )) {
            foreach ($subs[1] as $subHtml) {
                $sub = trim(strip_tags(html_entity_decode($subHtml, ENT_QUOTES | ENT_HTML5, 'UTF-8')));
                if ($sub === '' || $outline === []) {
                    continue;
                }
                $last = count($outline) - 1;
                $outline[$last]['subsections'][] = $sub;
            }
        }
        return $outline;
    }
    public static function extractKnowledge(string $html, string $query, int $maxChars = 4500): array
    {
        $html = preg_replace('/<script\b[^>]*>.*?<\/script>/is', '', $html) ?? $html;
        $html = preg_replace('/<style\b[^>]*>.*?<\/style>/is', '', $html) ?? $html;
        $terms = self::queryTerms($query);
        $images = self::extractImages($html);
        $links = self::extractLinks($html);
        $tables = self::extractTables($html);
        $blocks = self::extractBlocks($html);
        $picked = [];
        $used = 0;
        foreach ($blocks as $block) {
            $score = self::scoreText($block['text'], $terms);
            if ($score <= 0 && !in_array($block['tag'], ['h2', 'h3', 'th'], true)) {
                continue;
            }
            $line = $block['text'];
            $len = mb_strlen($line);
            if ($used + $len > $maxChars) {
                if ($used === 0) {
                    $picked[] = mb_substr($line, 0, $maxChars) . '…';
                    $used = $maxChars;
                }
                break;
            }
            $picked[] = $line;
            $used += $len + 1;
        }
        if ($picked === []) {
            foreach ($blocks as $block) {
                $line = $block['text'];
                $len = mb_strlen($line);
                if ($used + $len > $maxChars) {
                    break;
                }
                $picked[] = $line;
                $used += $len + 1;
            }
        }
        $tableText = [];
        foreach ($tables as $table) {
            if ($table === '') {
                continue;
            }
            if (self::scoreText($table, $terms) > 0 || $terms === []) {
                $tableText[] = $table;
            }
        }
        return [
            'text' => trim(implode("\n", $picked)),
            'links' => $links,
            'images' => $images,
            'tables' => array_slice($tableText, 0, 6),
        ];
    }
    private static function extractImages(string $html): array
    {
        $images = [];
        if (!preg_match_all('/<img\b[^>]*>/i', $html, $tags)) {
            return $images;
        }
        foreach ($tags[0] as $tag) {
            $src = '';
            $alt = '';
            if (preg_match('/\bsrc="([^"]+)"/i', $tag, $match)) {
                $src = self::decode($match[1]);
            }
            if (preg_match('/\balt="([^"]*)"/i', $tag, $match)) {
                $alt = self::decode($match[1]);
            }
            if ($src === '') {
                continue;
            }
            $images[] = [
                'src' => $src,
                'alt' => $alt,
            ];
        }
        return $images;
    }
    private static function extractLinks(string $html): array
    {
        $links = [];
        if (!preg_match_all('/<a\b[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/is', $html, $matches, PREG_SET_ORDER)) {
            return $links;
        }
        $seen = [];
        foreach ($matches as $match) {
            $url = self::decode($match[1]);
            $label = trim(preg_replace('/\s+/u', ' ', strip_tags(self::decode($match[2]))) ?? '');
            if ($url === '' || str_starts_with($url, '#')) {
                continue;
            }
            if (!preg_match('#/(article|document)/#i', $url)) {
                continue;
            }
            $key = mb_strtolower($url);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $links[] = [
                'title' => $label !== '' ? $label : $url,
                'url' => $url,
            ];
        }
        return $links;
    }
    private static function extractTables(string $html): array
    {
        $tables = [];
        if (!preg_match_all('/<table\b[^>]*>(.*?)<\/table>/is', $html, $matches)) {
            return $tables;
        }
        foreach ($matches[1] as $tableHtml) {
            $rows = [];
            if (!preg_match_all('/<tr\b[^>]*>(.*?)<\/tr>/is', $tableHtml, $trMatches)) {
                continue;
            }
            foreach ($trMatches[1] as $rowHtml) {
                if (!preg_match_all('/<(?:th|td)\b[^>]*>(.*?)<\/(?:th|td)>/is', $rowHtml, $cells)) {
                    continue;
                }
                $parts = [];
                foreach ($cells[1] as $cell) {
                    $text = trim(preg_replace('/\s+/u', ' ', strip_tags(self::decode($cell))) ?? '');
                    if ($text !== '') {
                        $parts[] = $text;
                    }
                }
                if ($parts !== []) {
                    $rows[] = implode(' | ', $parts);
                }
            }
            if ($rows !== []) {
                $tables[] = implode("\n", array_slice($rows, 0, 16));
            }
        }
        return $tables;
    }
    private static function extractBlocks(string $html): array
    {
        $blocks = [];
        if (!preg_match_all(
            '/<(p|h2|h3|li|th|td|figcaption)\b[^>]*>(.*?)<\/\1>/is',
            $html,
            $matches,
            PREG_SET_ORDER
        )) {
            return $blocks;
        }
        foreach ($matches as $match) {
            $tag = strtolower($match[1]);
            $text = trim(preg_replace('/\s+/u', ' ', strip_tags(self::decode($match[2]))) ?? '');
            if (mb_strlen($text) < 6) {
                continue;
            }
            if (in_array($tag, ['h2', 'h3'], true)) {
                $text = ($tag === 'h2' ? '# ' : '## ') . $text;
            } elseif ($tag === 'li') {
                $text = '- ' . $text;
            }
            $blocks[] = [
                'tag' => $tag,
                'text' => $text,
            ];
        }
        return $blocks;
    }
    private static function queryTerms(string $query): array
    {
        $parts = preg_split('/\s+/u', mb_strtolower(trim($query))) ?: [];
        $terms = [];
        foreach ($parts as $part) {
            $word = preg_replace('/[^a-z0-9àèéìòù]/u', '', $part) ?? '';
            if (mb_strlen($word) < 3) {
                continue;
            }
            $terms[] = $word;
        }
        return array_values(array_unique($terms));
    }
    private static function scoreText(string $text, array $terms): int
    {
        if ($terms === []) {
            return 1;
        }
        $haystack = mb_strtolower($text);
        $score = 0;
        foreach ($terms as $term) {
            if (str_contains($haystack, $term)) {
                $score += 2;
            }
        }
        return $score;
    }
    private static function decode(string $value): string
    {
        return html_entity_decode(trim($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}
