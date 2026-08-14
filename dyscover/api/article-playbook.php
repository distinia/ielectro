<?php
namespace Dyscover;
class ArticlePlaybook
{
    private static function dir(): string
    {
        return dirname(__DIR__) . '/data/articles';
    }
    public static function match(string $prompt, string $title, array $terms, string $archetype = ''): ?array
    {
        $playbooks = self::all();
        if ($playbooks === []) {
            return null;
        }
        $haystack = mb_strtolower(trim($prompt . ' ' . $title . ' ' . implode(' ', $terms) . ' ' . $archetype));
        $best = null;
        $bestScore = 0;
        foreach ($playbooks as $playbook) {
            $score = 0;
            if ($archetype !== '' && ($playbook['id'] ?? '') === $archetype) {
                $score += 20;
            }
            foreach (($playbook['match']['terms'] ?? []) as $term) {
                $term = mb_strtolower((string) $term);
                if ($term !== '' && str_contains($haystack, $term)) {
                    $score += 6;
                }
            }
            foreach (($playbook['match']['patterns'] ?? []) as $pattern) {
                $pattern = mb_strtolower((string) $pattern);
                if ($pattern !== '' && str_contains($haystack, $pattern)) {
                    $score += 10;
                }
            }
            $score += min(5, (int) ($playbook['usage_count'] ?? 0));
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $playbook;
            }
        }
        return $bestScore >= 10 ? $best : null;
    }
    public static function all(): array
    {
        $dir = self::dir();
        if (!is_dir($dir)) {
            return [];
        }
        $playbooks = [];
        foreach (glob($dir . '/*.json') ?: [] as $path) {
            $json = json_decode((string) file_get_contents($path), true);
            if (is_array($json) && !empty($json['id'])) {
                $playbooks[] = $json;
            }
        }
        return $playbooks;
    }
    public static function get(string $id): ?array
    {
        $path = self::dir() . '/' . self::safeId($id) . '.json';
        if (!is_file($path)) {
            return null;
        }
        $json = json_decode((string) file_get_contents($path), true);
        return is_array($json) ? $json : null;
    }
    public static function recordSuccess(string $id, array $terms, array $outline): void
    {
        $playbook = self::get($id);
        if ($playbook === null) {
            return;
        }
        $playbook['usage_count'] = (int) ($playbook['usage_count'] ?? 0) + 1;
        $playbook['updated_at'] = gmdate('c');
        $playbook['last_terms'] = array_values(array_unique(array_slice($terms, 0, 12)));
        if ($outline !== []) {
            $playbook['outline'] = $outline;
        }
        self::save($playbook);
    }
    public static function createFromGeneration(string $archetype, array $terms, array $outline): void
    {
        if ($archetype === '' || $outline === []) {
            return;
        }
        $id = self::safeId($archetype);
        if ($id === '' || self::get($id) !== null) {
            return;
        }
        self::save([
            'id' => $id,
            'label' => ucfirst(str_replace('-', ' ', $id)),
            'match' => [
                'terms' => array_values(array_unique(array_slice($terms, 0, 8))),
                'patterns' => [],
            ],
            'outline' => $outline,
            'template' => [
                'prefer_title_keywords' => [],
                'avoid_title_keywords' => ['country'],
                'min_field_score' => 10,
            ],
            'media_rules' => [
                'require_entity_in_title' => true,
            ],
            'usage_count' => 1,
            'updated_at' => gmdate('c'),
        ]);
    }
    public static function formatOutline(array $playbook): string
    {
        $lines = [];
        foreach (($playbook['outline'] ?? []) as $section) {
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
    private static function save(array $playbook): void
    {
        $dir = self::dir();
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $id = self::safeId((string) ($playbook['id'] ?? ''));
        if ($id === '') {
            return;
        }
        $playbook['id'] = $id;
        file_put_contents(
            $dir . '/' . $id . '.json',
            json_encode($playbook, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );
    }
    private static function safeId(string $id): string
    {
        $id = strtolower(trim($id));
        $id = (string) preg_replace('/[^a-z0-9-]+/', '-', $id);
        return trim($id, '-');
    }
}
