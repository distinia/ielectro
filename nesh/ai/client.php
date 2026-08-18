<?php
namespace Nesh\Ai;
class Client
{
    private const MAX_ATTEMPTS = 4;
    /** @var callable|null */
    private static $onWait = null;
    public static function onWait(?callable $callback): void
    {
        self::$onWait = $callback;
    }
    public static function isLocal(): bool
    {
        try {
            return self::isLocalServer(self::resolveBaseUrl());
        } catch (\Throwable) {
            return false;
        }
    }
    public static function chat(
        array $messages,
        float $temperature = 0.4,
        int $maxTokens = 4096,
        ?string $model = null
    ): string {
        $baseUrl = self::resolveBaseUrl();
        $model = $model ?? self::defaultModel();
        $apiKey = Config::apiKey();
        $local = self::isLocalServer($baseUrl);
        if ($baseUrl === '') {
            throw new \RuntimeException(
                'LLM is not configured. Set LLM_PROVIDER and LLM_BASE_URL (or use a known provider preset) in nesh/ai/config.local.php'
            );
        }
        if ($model === '') {
            throw new \RuntimeException(
                'LLM model is not configured. Set LLM_MODEL in nesh/ai/config.local.php'
            );
        }
        if ($apiKey === '' && !$local) {
            throw new \RuntimeException(
                'LLM API key is not configured. Set LLM_API_KEY in nesh/ai/config.local.php'
            );
        }
        $body = [
            'model' => $model,
            'messages' => $messages,
            'temperature' => $temperature,
            'max_tokens' => $maxTokens,
        ];
        // Qwen 3 defaults to chain-of-thought; disable so JSON/text callers get the answer.
        if (self::provider() === 'llamacpp' || str_contains(strtolower($model), 'qwen3')) {
            $body['chat_template_kwargs'] = ['enable_thinking' => false];
        }
        $payload = json_encode($body, JSON_UNESCAPED_UNICODE);
        if ($payload === false) {
            throw new \RuntimeException('Unable to encode LLM request');
        }
        $headers = ['Content-Type: application/json'];
        if ($apiKey !== '') {
            $headers[] = 'Authorization: Bearer ' . $apiKey;
        }
        $lastError = 'LLM request failed';
        $endpoint = $baseUrl . self::chatPath();
        for ($attempt = 1; $attempt <= self::MAX_ATTEMPTS; $attempt++) {
            $ch = curl_init($endpoint);
            if ($ch === false) {
                throw new \RuntimeException('Unable to start LLM request');
            }
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_POSTFIELDS => $payload,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 20,
                CURLOPT_TIMEOUT => $local ? 1800 : 120,
            ]);
            if ($local || self::$onWait !== null) {
                $onWait = self::$onWait;
                curl_setopt($ch, CURLOPT_NOPROGRESS, false);
                curl_setopt(
                    $ch,
                    CURLOPT_PROGRESSFUNCTION,
                    static function (
                        $handle,
                        int $downloadTotal,
                        int $downloaded,
                        int $uploadTotal,
                        int $uploaded
                    ) use ($onWait): int {
                        @set_time_limit(0);
                        if ($onWait !== null) {
                            $onWait();
                        }
                        return 0;
                    }
                );
            }
            $raw = curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            unset($ch);
            if ($raw === false) {
                if ($local && str_contains(strtolower($error), 'connection refused')) {
                    throw new \RuntimeException(self::localOfflineMessage($model));
                }
                throw new \RuntimeException($error !== '' ? $error : 'LLM request failed');
            }
            $json = json_decode($raw, true);
            if ($status >= 400 || !is_array($json)) {
                $message = is_array($json)
                    ? (string) ($json['error']['message'] ?? (is_string($json['error'] ?? null) ? $json['error'] : 'LLM request failed'))
                    : 'LLM request failed';
                $lastError = self::friendlyError($message);
                if ($attempt < self::MAX_ATTEMPTS && self::shouldRetry($status, $message)) {
                    $wait = self::parseRetrySeconds($message) ?? (2 + ($attempt * 2));
                    usleep((int) ceil($wait * 1_000_000));
                    continue;
                }
                throw new \RuntimeException($lastError);
            }
            $content = $json['choices'][0]['message']['content'] ?? '';
            if (!is_string($content) || trim($content) === '') {
                throw new \RuntimeException('Empty LLM response');
            }
            return self::normalizeContent($content);
        }
        throw new \RuntimeException($lastError);
    }
    public static function provider(): string
    {
        return Config::provider();
    }
    public static function defaultModel(): string
    {
        $model = Config::model();
        if ($model !== '') {
            return $model;
        }
        $preset = self::providerPreset(self::provider());
        return (string) ($preset['default_model'] ?? '');
    }
    public static function fastModel(): string
    {
        $fast = Config::fastModel();
        if ($fast !== '') {
            return $fast;
        }
        $preset = self::providerPreset(self::provider());
        $fast = (string) ($preset['fast_model'] ?? '');
        return $fast !== '' ? $fast : self::defaultModel();
    }
    public static function pause(): void
    {
        $ms = Config::requestPauseMs();
        if ($ms > 0) {
            usleep($ms * 1000);
        }
    }
    public static function isConfigured(): bool
    {
        try {
            return self::resolveBaseUrl() !== ''
                && self::defaultModel() !== ''
                && (Config::apiKey() !== '' || self::isLocalServer(self::resolveBaseUrl()));
        } catch (\Throwable) {
            return false;
        }
    }
    private static function resolveBaseUrl(): string
    {
        $baseUrl = Config::baseUrl();
        if ($baseUrl !== '') {
            return $baseUrl;
        }
        $preset = self::providerPreset(self::provider());
        return rtrim((string) ($preset['base_url'] ?? ''), '/');
    }
    private static function chatPath(): string
    {
        return Config::chatPath();
    }
    private static function providerPreset(string $provider): array
    {
        return self::providerPresets()[$provider] ?? [];
    }
    private static function providerPresets(): array
    {
        return [
            'openai' => [
                'base_url' => 'https://api.openai.com/v1',
                'default_model' => 'gpt-4o-mini',
                'fast_model' => 'gpt-4o-mini',
            ],
            'groq' => [
                'base_url' => 'https://api.groq.com/openai/v1',
                'default_model' => 'llama-3.3-70b-versatile',
                'fast_model' => 'llama-3.1-8b-instant',
            ],
            'openrouter' => [
                'base_url' => 'https://openrouter.ai/api/v1',
                'default_model' => 'meta-llama/llama-3.3-70b-instruct',
                'fast_model' => 'meta-llama/llama-3.1-8b-instruct',
            ],
            'together' => [
                'base_url' => 'https://api.together.xyz/v1',
                'default_model' => 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
                'fast_model' => 'meta-llama/Llama-3.1-8B-Instruct-Turbo',
            ],
            'mistral' => [
                'base_url' => 'https://api.mistral.ai/v1',
                'default_model' => 'mistral-small-latest',
                'fast_model' => 'mistral-small-latest',
            ],
            'ollama' => [
                'base_url' => 'http://127.0.0.1:11434/v1',
                'default_model' => 'llama3.1:8b',
                'fast_model' => 'llama3.1:8b',
            ],
            'llamacpp' => [
                'base_url' => 'http://127.0.0.1:8080/v1',
                'default_model' => 'Qwen/Qwen3-8B-GGUF:Q4_K_M',
                'fast_model' => 'Qwen/Qwen3-8B-GGUF:Q4_K_M',
            ],
            'custom' => [],
        ];
    }
    private static function shouldRetry(int $status, string $message): bool
    {
        if ($status === 429) {
            return true;
        }
        $lower = strtolower($message);
        return str_contains($lower, 'rate limit')
            || str_contains($lower, 'tokens per minute')
            || str_contains($lower, 'try again in');
    }
    private static function parseRetrySeconds(string $message): ?float
    {
        if (preg_match('/try again in ([0-9.]+)s/i', $message, $match)) {
            return (float) $match[1];
        }
        return null;
    }
    private static function friendlyError(string $message): string
    {
        if (self::shouldRetry(429, $message)) {
            return 'LLM rate limit reached. Wait a few seconds and try again.';
        }
        return $message !== '' ? $message : 'LLM request failed';
    }
    private static function isLocalServer(string $baseUrl): bool
    {
        $provider = self::provider();
        if (in_array($provider, ['ollama', 'llamacpp'], true)) {
            return true;
        }
        $host = strtolower($baseUrl);
        return str_contains($host, '127.0.0.1')
            || str_contains($host, 'localhost')
            || str_contains($host, '::1')
            || str_contains($host, '11434')
            || str_contains($host, 'ollama')
            || str_contains($host, 'llamacpp')
            || str_contains($host, 'llama.cpp');
    }
    private static function localOfflineMessage(string $model): string
    {
        if (self::provider() === 'ollama' || str_contains(self::resolveBaseUrl(), '11434')) {
            return 'Ollama is not running. Start it, then run: ollama pull ' . $model;
        }
        return 'llama.cpp server is not running. Start llama-server with your Qwen 3 8B model on '
            . self::resolveBaseUrl();
    }
    private static function normalizeContent(string $content): string
    {
        $content = preg_replace('/<think\b[^>]*>[\s\S]*?(<\/think>|$)/iu', '', $content) ?? $content;
        return trim($content);
    }
}
