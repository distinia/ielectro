<?php
namespace Dyscover;

use Nesh\Query;
use Nesh\Response;
use Nesh\Schema;

final class Moderation
{
    public const REPORT_REASONS = [
        'spam' => 'Spam or misleading content',
        'harassment' => 'Harassment or bullying',
        'hate_speech' => 'Hate speech or discrimination',
        'violence' => 'Violence or threats',
        'nudity' => 'Nudity or sexual content',
        'misinformation' => 'False or harmful information',
        'impersonation' => 'Impersonation',
        'copyright' => 'Copyright infringement',
        'other' => 'Other',
    ];

    public static function assertCleanText(string $text): void
    {
        $value = trim($text);
        if ($value === '') {
            return;
        }
        try {
            $terms = Query::fetchAll(
                'SELECT term, match_type FROM ' . Schema::DYSCOVER_BANNED_TERMS . ' ORDER BY LENGTH(term) DESC'
            );
        } catch (\Throwable) {
            return;
        }
        $lower = mb_strtolower($value);
        foreach ($terms as $row) {
            $term = mb_strtolower(trim((string) $row['term']));
            if ($term === '') {
                continue;
            }
            $matchType = (string) ($row['match_type'] ?? 'contains');
            if ($matchType === 'exact' && $lower === $term) {
                Response::badRequest('Content contains a restricted term');
            }
            if ($matchType === 'word' && preg_match('/\b' . preg_quote($term, '/') . '\b/u', $lower)) {
                Response::badRequest('Content contains a restricted term');
            }
            if ($matchType === 'contains' && str_contains($lower, $term)) {
                Response::badRequest('Content contains a restricted term');
            }
        }
    }

    public static function reasonLabel(string $reason): string
    {
        return self::REPORT_REASONS[$reason] ?? $reason;
    }
}
