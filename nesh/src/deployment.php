<?php
namespace Nesh;

final class Deployment
{
    public const FOLDERS = [
        'account',
        'admin',
        'dyscover',
        'dominions',
        'nesh',
        'www',
    ];

    private const PRODUCTION_URLS = [
        'account' => 'https://account.ielectro.com',
        'admin' => 'https://admin.ielectro.com',
        'dyscover' => 'https://dyscover.ielectro.com',
        'dominions' => 'https://dominions.ielectro.com',
        'nesh' => 'https://nesh.ielectro.com',
        'www' => 'https://www.ielectro.com',
    ];

    private const AUTOLOAD_APPS = [
        'account' => [
            'global' => 'account',
            'name' => 'iElectro Account',
            'database' => 'ielectro_account',
            'version' => '1.0.0',
        ],
        'admin' => [
            'global' => 'admin',
            'name' => 'iElectro Admin',
            'database' => 'ielectro_admin',
            'version' => '1.0.0',
        ],
        'dyscover' => [
            'global' => 'dyscover',
            'name' => 'Dyscover',
            'database' => 'ielectro_dyscover',
            'version' => '1.0.0',
        ],
        'dominions' => [
            'global' => 'dominions',
            'name' => 'Dominions',
            'database' => 'ielectro_dominions',
            'version' => '1.0.0',
        ],
        'www' => [
            'global' => 'ielectro',
            'name' => 'iElectro',
            'database' => null,
            'version' => '1.0.0',
        ],
    ];

    private const SCAN_EXTENSIONS = [
        'php',
        'js',
        'html',
        'css',
        'json',
        'md',
    ];

    private const SKIP_DIRS = [
        '.git',
        'vendor',
        'node_modules',
    ];

    private string $root;
    private string $autoloadPath;

    public function __construct(string $root)
    {
        $this->root = rtrim(str_replace('\\', '/', $root), '/');
        $this->autoloadPath = $this->root . '/nesh/src/autoload.php';
    }

    public static function folders(): array
    {
        return self::FOLDERS;
    }

    public function apply(string $inputUrl): array
    {
        $parsed = $this->parseUrl($inputUrl);
        $mode = $this->detectMode($parsed);
        $baseUrl = $this->baseUrl($parsed, $mode);
        $applicationUrls = $this->applicationUrls($parsed, $mode, $baseUrl);
        $domain = $this->deploymentDomain($parsed, $mode);
        $currentUrls = $this->readAutoloadUrls();
        $replacementMap = $this->replacementMap($currentUrls, $applicationUrls);
        $autoload = file_get_contents($this->autoloadPath);
        if ($autoload === false) {
            throw new \RuntimeException('Unable to read autoload.php');
        }
        $updatedAutoload = $this->updateAutoload(
            $autoload,
            $mode,
            $baseUrl,
            $domain,
            $applicationUrls,
            $parsed['scheme'] ?? 'https'
        );
        $fileStats = $this->migrateProjectFiles($replacementMap);

        if ($updatedAutoload !== $autoload) {
            file_put_contents($this->autoloadPath, $updatedAutoload);
        }

        return [
            'mode' => $mode,
            'base_url' => $baseUrl,
            'domain' => $domain,
            'applications' => $applicationUrls,
            'files_updated' => $fileStats['files'],
            'replacements' => $fileStats['replacements'],
        ];
    }

    public function parseUrl(string $url): array
    {
        $url = trim($url);
        if ($url === '') {
            throw new \InvalidArgumentException('Missing deployment URL.');
        }

        if (!preg_match('#^https?://#i', $url)) {
            $url = 'https://' . $url;
        }

        $parsed = parse_url($url);
        if ($parsed === false || empty($parsed['host'])) {
            throw new \InvalidArgumentException('Invalid deployment URL.');
        }

        $parsed['scheme'] = strtolower($parsed['scheme'] ?? 'https');
        $parsed['host'] = strtolower($parsed['host']);
        $parsed['path'] = $this->normalizePath($parsed['path'] ?? '');

        return $parsed;
    }

    public function detectMode(array $parsed): string
    {
        $path = trim($parsed['path'] ?? '', '/');
        $host = $parsed['host'] ?? '';

        if ($path !== '') {
            return 'subfolder';
        }

        if ($host === 'localhost' || $host === '127.0.0.1') {
            throw new \InvalidArgumentException(
                'Local deployment requires a base path, for example: http://localhost/ielectro'
            );
        }

        if ($this->usesSubfolderHosting($host)) {
            return 'subfolder';
        }

        return 'subdomain';
    }

    public function baseUrl(array $parsed, string $mode): string
    {
        $scheme = $parsed['scheme'] ?? 'https';
        $host = $parsed['host'] ?? '';
        $port = isset($parsed['port']) ? ':' . $parsed['port'] : '';

        if ($mode === 'subdomain') {
            return rtrim("{$scheme}://{$host}{$port}", '/');
        }

        $path = trim($parsed['path'] ?? '', '/');
        if ($path === '') {
            return rtrim("{$scheme}://{$host}{$port}", '/');
        }

        return rtrim("{$scheme}://{$host}{$port}/{$path}", '/');
    }

    public function applicationUrls(array $parsed, string $mode, string $baseUrl): array
    {
        $urls = [];
        $scheme = $parsed['scheme'] ?? 'https';
        $host = $parsed['host'] ?? '';
        $port = isset($parsed['port']) ? ':' . $parsed['port'] : '';

        if ($mode === 'subdomain') {
            $apex = $this->apexHost($host);
            foreach (self::FOLDERS as $folder) {
                $subdomain = $folder;
                $urls[$folder] = rtrim("{$scheme}://{$subdomain}.{$apex}{$port}", '/');
            }
            return $urls;
        }

        foreach (self::FOLDERS as $folder) {
            $urls[$folder] = rtrim($baseUrl, '/') . '/' . $folder;
        }

        return $urls;
    }

    private function readAutoloadUrls(): array
    {
        $content = file_get_contents($this->autoloadPath);
        if ($content === false) {
            return [];
        }

        $urls = [];
        $pattern = '/\$GLOBALS\[\'([^\']+)\'\]\s*=\s*new App\(\s*\'[^\']*\',\s*\'([^\']*)\',\s*\'([^\']*)\'/';

        if (!preg_match_all($pattern, $content, $matches, PREG_SET_ORDER)) {
            return $urls;
        }

        foreach ($matches as $match) {
            $urls[$match[3]] = $match[2];
        }

        return $urls;
    }

    private function replacementMap(array $currentUrls, array $targetUrls): array
    {
        $map = [];

        foreach (self::FOLDERS as $folder) {
            $target = $targetUrls[$folder];

            if (isset($currentUrls[$folder]) && $currentUrls[$folder] !== $target) {
                $map[$currentUrls[$folder]] = $target;
            }

            $production = self::PRODUCTION_URLS[$folder] ?? null;
            if ($production !== null && $production !== $target) {
                $map[$production] = $target;
            }
        }

        uksort($map, static fn(string $a, string $b): int => strlen($b) <=> strlen($a));

        return $map;
    }

    private function updateAutoload(
        string $content,
        string $mode,
        string $baseUrl,
        string $domain,
        array $applicationUrls,
        string $scheme
    ): string {
        $content = preg_replace(
            '/# Deployment:.*(\r?\n# Base URL:.*)?(\r?\n)?/',
            '',
            $content
        ) ?? $content;

        $content = preg_replace(
            "/define\\('DOMAIN',\\s*'[^']*'\\);/",
            "define('DOMAIN', '{$domain}');",
            $content,
            1
        ) ?? $content;

        $cookieDomain = $this->cookieDomain($domain);
        $content = preg_replace(
            "/define\\('COOKIE_DOMAIN',\\s*'[^']*'\\);/",
            "define('COOKIE_DOMAIN', '{$cookieDomain}');",
            $content,
            1
        ) ?? $content;
        $content = preg_replace(
            "/define\\('COOKIE_DOMAIN',\\s*'\\.'\\s*\\.\\s*DOMAIN\\);/",
            "define('COOKIE_DOMAIN', '{$cookieDomain}');",
            $content,
            1
        ) ?? $content;

        $cookieSecure = $scheme === 'https' ? 'true' : 'false';
        $content = preg_replace(
            "/define\\('COOKIE_SECURE',\\s*(true|false)\\);/",
            "define('COOKIE_SECURE', {$cookieSecure});",
            $content,
            1
        ) ?? $content;

        foreach (self::AUTOLOAD_APPS as $folder => $app) {
            $url = $applicationUrls[$folder];
            $database = $app['database'] === null
                ? 'null'
                : "'" . $app['database'] . "'";
            $line = "\$GLOBALS['{$app['global']}'] = new App('{$app['name']}', '{$url}', '{$folder}', {$database}, '{$app['version']}');";
            $pattern = '/\$GLOBALS\[\'' . preg_quote($app['global'], '/') . '\'\]\s*=\s*new App\([^;]+\);/';

            if (preg_match($pattern, $content)) {
                $content = preg_replace($pattern, $line, $content, 1) ?? $content;
            }
        }

        $deploymentBlock = "# Deployment: {$mode}\n# Base URL: {$baseUrl}\n";
        return preg_replace(
            '/(# Service\r?\n)/',
            '$1' . $deploymentBlock,
            $content,
            1
        ) ?? $content;
    }

    private function migrateProjectFiles(array $replacementMap): array
    {
        if ($replacementMap === []) {
            return ['files' => 0, 'replacements' => 0];
        }

        $filesUpdated = 0;
        $replacementCount = 0;
        $autoloadReal = str_replace('\\', '/', realpath($this->autoloadPath) ?: $this->autoloadPath);
        $skipFiles = [
            $autoloadReal,
            str_replace('\\', '/', realpath($this->root . '/nesh/src/deployment.php') ?: $this->root . '/nesh/src/deployment.php'),
            str_replace('\\', '/', realpath($this->root . '/nesh/cli/routing-test.php') ?: $this->root . '/nesh/cli/routing-test.php'),
        ];

        foreach ($this->scanFiles($this->root) as $file) {
            $real = str_replace('\\', '/', realpath($file) ?: $file);
            if (in_array($real, $skipFiles, true)) {
                continue;
            }

            $original = file_get_contents($file);
            if ($original === false || $original === '') {
                continue;
            }

            $updated = $original;
            $localCount = 0;

            foreach ($replacementMap as $from => $to) {
                $count = 0;
                $updated = str_replace($from, $to, $updated, $count);
                $localCount += $count;
            }

            if ($updated !== $original) {
                file_put_contents($file, $updated);
                $filesUpdated++;
                $replacementCount += $localCount;
            }
        }

        return [
            'files' => $filesUpdated,
            'replacements' => $replacementCount,
        ];
    }

    private function scanFiles(string $directory): \Generator
    {
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator(
                $directory,
                \FilesystemIterator::SKIP_DOTS
            )
        );

        foreach ($iterator as $file) {
            if (!$file->isFile()) {
                continue;
            }

            $pathname = str_replace('\\', '/', $file->getPathname());
            foreach (self::SKIP_DIRS as $skip) {
                if (str_contains($pathname, '/' . $skip . '/')) {
                    continue 2;
                }
            }

            $extension = strtolower($file->getExtension());
            if (!in_array($extension, self::SCAN_EXTENSIONS, true)) {
                continue;
            }

            yield $pathname;
        }
    }

    private function usesSubfolderHosting(string $host): bool
    {
        $patterns = [
            'altervista.org',
            '000webhostapp.com',
            'github.io',
        ];

        foreach ($patterns as $pattern) {
            if ($host === $pattern || str_ends_with($host, '.' . $pattern)) {
                return true;
            }
        }

        return false;
    }

    private function apexHost(string $host): string
    {
        if ($host === 'localhost' || $host === '127.0.0.1') {
            return $host;
        }

        if (str_starts_with($host, 'www.')) {
            return substr($host, 4);
        }

        return $host;
    }

    private function deploymentDomain(array $parsed, string $mode): string
    {
        if ($mode === 'subdomain') {
            return $this->apexHost($parsed['host'] ?? '');
        }

        return $parsed['host'] ?? '';
    }

    private function cookieDomain(string $domain): string
    {
        if ($domain === 'localhost' || $domain === '127.0.0.1') {
            return '';
        }

        return '.' . ltrim($domain, '.');
    }

    private function normalizePath(string $path): string
    {
        $path = str_replace('\\', '/', $path);
        $path = preg_replace('#/+#', '/', $path) ?? '/';

        if ($path !== '/' && str_ends_with($path, '/')) {
            $path = rtrim($path, '/');
        }

        return $path === '' ? '/' : $path;
    }
}
