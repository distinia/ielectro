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
    private static function decode(string $value): string
    {
        return html_entity_decode(trim($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}
