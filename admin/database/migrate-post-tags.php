<?php
/**
 * Enrich Dyscover post tags and remove unused tag dictionary rows.
 * Run once: php admin/database/migrate-post-tags.php
 * Fast rules only: php admin/database/migrate-post-tags.php --no-llm
 */
declare(strict_types=1);

$root = dirname(__DIR__, 2);
require_once $root . '/nesh/src/autoload.php';
require_once $root . '/dyscover/api/post-tag-enricher.php';

use Dyscover\PostTagEnricher;

$useLlm = !in_array('--no-llm', $argv ?? [], true);

echo $useLlm
    ? "=== Normalizing post tags to max 5 (rules + LLM) ===\n"
    : "=== Normalizing post tags to max 5 (rules only) ===\n";

$trim = PostTagEnricher::normalizeAll();
echo '[OK] Trimmed posts: ' . (int) ($trim['updated'] ?? 0) . "\n";

$result = PostTagEnricher::enrichAll($useLlm);

echo '[OK] Updated posts: ' . (int) ($result['updated'] ?? 0) . "\n";
echo '[OK] Pruned unused tags: ' . (int) (($trim['pruned'] ?? 0) + ($result['pruned'] ?? 0)) . "\n";
echo "=== Done ===\n";
