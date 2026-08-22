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
    private const COPY_SKIP_DIRS = [
        '.git',
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
    public static function folderNameFromUrl(string $url): string
    {
        $deployment = new self(ROOT_PATH);
        $parsed = $deployment->parseUrl($url);
        $host = strtolower($parsed['host'] ?? '');
        if ($host === '') {
            throw new \InvalidArgumentException('Unable to derive deployment folder name.');
        }
        $safe = preg_replace('/[^A-Za-z0-9._-]+/', '-', $host) ?? $host;
        $safe = trim($safe, '.-');
        if ($safe === '') {
            throw new \InvalidArgumentException('Unable to derive deployment folder name.');
        }
        return $safe;
    }
    public static function pathFromUrl(string $url): string
    {
        return dirname(ROOT_PATH) . '/' . self::folderNameFromUrl($url);
    }
    public static function copyProject(string $sourceRoot, string $targetRoot): void
    {
        $sourceRoot = rtrim(str_replace('\\', '/', $sourceRoot), '/');
        $targetRoot = rtrim(str_replace('\\', '/', $targetRoot), '/');
        if (!is_dir($sourceRoot)) {
            throw new \RuntimeException('Source project not found: ' . $sourceRoot);
        }
        if ($sourceRoot === $targetRoot) {
            throw new \InvalidArgumentException(
                'Source and target paths must be different.'
            );
        }
        if (is_dir($targetRoot) || is_file($targetRoot)) {
            if (!File::deleteDirectory($targetRoot)) {
                throw new \RuntimeException(
                    'Unable to remove existing target: ' . $targetRoot
                );
            }
        }
        if (!self::copyDirectorySkipping($sourceRoot, $targetRoot, self::COPY_SKIP_DIRS)) {
            throw new \RuntimeException('Unable to copy project to: ' . $targetRoot);
        }
    }
    public static function zipDirectory(string $directory): string
    {
        if (!class_exists(\ZipArchive::class)) {
            throw new \RuntimeException('ZipArchive is not available in this PHP build.');
        }
        $directory = rtrim(str_replace('\\', '/', $directory), '/');
        if (!is_dir($directory)) {
            throw new \RuntimeException('Deployment folder not found: ' . $directory);
        }
        $zipPath = $directory . '.zip';
        if (is_file($zipPath) && !unlink($zipPath)) {
            throw new \RuntimeException('Unable to replace existing archive: ' . $zipPath);
        }
        $zip = new \ZipArchive();
        if ($zip->open($zipPath, \ZipArchive::CREATE) !== true) {
            throw new \RuntimeException('Unable to create archive: ' . $zipPath);
        }
        $rootLength = strlen($directory) + 1;
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator(
                $directory,
                \FilesystemIterator::SKIP_DOTS
            ),
            \RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($iterator as $file) {
            $pathname = str_replace('\\', '/', $file->getPathname());
            $relative = substr($pathname, $rootLength);
            if ($relative === false || $relative === '') {
                continue;
            }
            if ($file->isDir()) {
                $zip->addEmptyDir($relative);
                continue;
            }
            $zip->addFile($pathname, $relative);
        }
        if (!$zip->close()) {
            throw new \RuntimeException('Unable to finalize archive: ' . $zipPath);
        }
        return $zipPath;
    }
    public function buildUnifiedSql(?string $outputPath = null): array
    {
        $outputPath = $this->resolveSqlOutputPath($outputPath);
        $registry = $this->readAutoloadRegistry();
        $sections = [];
        $fileCount = 0;
        $applications = [];
        foreach (self::AUTOLOAD_APPS as $folder => $app) {
            if ($app['database'] === null) {
                continue;
            }
            $databasePath = $this->root . '/' . $folder . '/database';
            if (!is_dir($databasePath)) {
                continue;
            }
            $files = glob($databasePath . '/*.sql') ?: [];
            if ($files === []) {
                continue;
            }
            sort($files, SORT_NATURAL);
            $databaseName = $registry[$folder]['database'] ?? $app['database'];
            $applications[] = $folder;
            $sections[] = '-- ============================================================';
            $sections[] = '-- Application: ' . $app['name'];
            $sections[] = '-- Folder: ' . $folder;
            $sections[] = '-- Database: ' . $databaseName;
            $sections[] = '-- ============================================================';
            $sections[] = '';
            foreach ($files as $file) {
                $sql = trim((string) file_get_contents($file));
                if ($sql === '') {
                    continue;
                }
                $sections[] = '-- Source: ' . $folder . '/database/' . basename($file);
                $sections[] = $sql;
                $sections[] = '';
                $fileCount++;
            }
        }
        if ($fileCount === 0) {
            throw new \RuntimeException('No SQL files found in application database folders.');
        }
        $header = [
            '-- iElectro unified database schema',
            '-- Generated: ' . date('Y-m-d H:i:s'),
            '-- Order: ' . implode(' -> ', $applications),
            '',
        ];
        $content = implode(PHP_EOL, array_merge($header, $sections));
        File::makeDirectory(dirname($outputPath));
        if (file_put_contents($outputPath, $content) === false) {
            throw new \RuntimeException('Unable to write SQL file: ' . $outputPath);
        }
        return [
            'path' => $outputPath,
            'files' => $fileCount,
            'applications' => $applications,
        ];
    }
    public function clearBootMarkers(): array
    {
        $removed = [];
        foreach (self::FOLDERS as $folder) {
            $boot = $this->root . '/' . $folder . '/.booted';
            if (is_file($boot) && unlink($boot)) {
                $removed[] = $folder . '/.booted';
            }
        }
        return $removed;
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
        $userAssets = $this->clearUserAssetDirectories();
        return [
            'mode' => $mode,
            'base_url' => $baseUrl,
            'domain' => $domain,
            'applications' => $applicationUrls,
            'files_updated' => $fileStats['files'],
            'replacements' => $fileStats['replacements'],
            'user_assets_cleared' => $userAssets,
        ];
    }
    private function clearUserAssetDirectories(): array
    {
        $cleared = [];
        foreach (self::FOLDERS as $folder) {
            $path = $this->root . '/' . $folder . '/assets/users';
            if (!is_dir($path)) {
                continue;
            }
            File::emptyDirectory($path);
            $cleared[] = $folder . '/assets/users';
        }
        return $cleared;
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
    private function readAutoloadRegistry(): array
    {
        $content = file_get_contents($this->autoloadPath);
        if ($content === false) {
            return [];
        }
        $registry = [];
        $pattern = '/\$GLOBALS\[\'([^\']+)\'\]\s*=\s*new App\(\s*\'([^\']*)\',\s*\'([^\']*)\',\s*\'([^\']+)\',\s*(\'[^\']*\'|null),\s*\'[^\']*\'\s*\);/';
        if (!preg_match_all($pattern, $content, $matches, PREG_SET_ORDER)) {
            return $registry;
        }
        foreach ($matches as $match) {
            $registry[$match[4]] = [
                'global' => $match[1],
                'name' => $match[2],
                'url' => $match[3],
                'database' => $match[5] === 'null'
                    ? null
                    : trim($match[5], "'"),
            ];
        }
        return $registry;
    }
    private function resolveSqlOutputPath(?string $outputPath): string
    {
        if ($outputPath === null || trim($outputPath) === '') {
            return $this->root . '/nesh/database/ielectro.sql';
        }
        $outputPath = str_replace('\\', '/', trim($outputPath));
        if (!preg_match('#^[A-Za-z]:/#', $outputPath) && !str_starts_with($outputPath, '/')) {
            return $this->root . '/' . ltrim($outputPath, '/');
        }
        return $outputPath;
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
    private static function copyDirectorySkipping(
        string $source,
        string $destination,
        array $skipDirs
    ): bool {
        if (!is_dir($source)) {
            return false;
        }
        File::makeDirectory($destination);
        foreach (File::scan($source) as $item) {
            if (in_array($item, $skipDirs, true)) {
                continue;
            }
            $from = rtrim($source, '/\\') . DIRECTORY_SEPARATOR . $item;
            $to = rtrim($destination, '/\\') . DIRECTORY_SEPARATOR . $item;
            if (is_dir($from)) {
                if (!self::copyDirectorySkipping($from, $to, $skipDirs)) {
                    return false;
                }
                continue;
            }
            if (!File::copyPath($from, $to, true)) {
                return false;
            }
        }
        return true;
    }
}
