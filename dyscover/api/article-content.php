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

    private static function decode(string $value): string
    {
        return html_entity_decode(trim($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}
