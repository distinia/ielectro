<?php
/**
 * Nesh AI configuration.
 *
 * Copy to nesh/ai/config.local.php and set your values.
 * config.local.php is gitignored — never commit API keys.
 *
 * Uses any OpenAI-compatible Chat Completions API:
 * OpenAI, Groq, OpenRouter, Together, Mistral, Ollama, llama.cpp, or a custom endpoint.
 */
// Provider preset: openai | groq | openrouter | together | mistral | ollama | llamacpp | custom
// Presets fill LLM_BASE_URL and default models when those constants are omitted.
define('LLM_PROVIDER', 'llamacpp');
// Optional overrides (required for LLM_PROVIDER = custom)
define('LLM_BASE_URL', 'http://127.0.0.1:8080/v1');
// Must match the model id/alias from llama-server GET /v1/models.
define('LLM_MODEL', 'Qwen/Qwen3-8B-GGUF:Q4_K_M');
define('LLM_MODEL_FAST', 'Qwen/Qwen3-8B-GGUF:Q4_K_M');
// Local llama.cpp does not need a key (leave empty).
define('LLM_API_KEY', '');
// Optional: default /chat/completions — change only for non-standard APIs
// define('LLM_CHAT_PATH', '/chat/completions');
// Optional: pause between chained LLM calls (milliseconds). Local servers can use a low value.
define('LLM_REQUEST_PAUSE_MS', 100);
// --- Other provider examples (uncomment one block) ---
// Groq
// define('LLM_PROVIDER', 'groq');
// define('LLM_BASE_URL', 'https://api.groq.com/openai/v1');
// define('LLM_MODEL', 'llama-3.3-70b-versatile');
// define('LLM_MODEL_FAST', 'llama-3.1-8b-instant');
// define('LLM_API_KEY', 'gsk_...');
// OpenAI
// define('LLM_PROVIDER', 'openai');
// define('LLM_API_KEY', 'sk-...');
// define('LLM_MODEL', 'gpt-4o-mini');
// define('LLM_MODEL_FAST', 'gpt-4o-mini');
// OpenRouter
// define('LLM_PROVIDER', 'openrouter');
// define('LLM_API_KEY', 'or-...');
// define('LLM_MODEL', 'meta-llama/llama-3.3-70b-instruct');
// define('LLM_MODEL_FAST', 'meta-llama/llama-3.1-8b-instruct');
// Together AI
// define('LLM_PROVIDER', 'together');
// define('LLM_API_KEY', '...');
// define('LLM_MODEL', 'meta-llama/Llama-3.3-70B-Instruct-Turbo');
// Mistral
// define('LLM_PROVIDER', 'mistral');
// define('LLM_API_KEY', '...');
// Local Ollama (no API key)
// define('LLM_PROVIDER', 'ollama');
// define('LLM_MODEL', 'llama3.1:8b');
// define('LLM_API_KEY', '');
// Fully custom endpoint
// define('LLM_PROVIDER', 'custom');
// define('LLM_BASE_URL', 'https://your-api.example/v1');
// define('LLM_MODEL', 'your-model-id');
// define('LLM_MODEL_FAST', 'your-fast-model-id');
// define('LLM_API_KEY', '...');
