<?php
namespace Nesh;
final class DatabaseCli
{
    private const SCHEMA_CONSTANTS = [
        'account' => 'ACCOUNT',
        'admin' => 'ADMIN',
        'dyscover' => 'DYSCOVER',
        'dominions' => 'DOMINIONS',
    ];
    private const APP_ORDER = [
        'account',
        'admin',
        'dyscover',
        'dominions',
    ];
    private const SCAN_EXTENSIONS = [
        'php',
        'sql',
        'js',
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
    private string $schemaPath;
    public function __construct(string $root)
    {
        $this->root = rtrim(str_replace('\\', '/', $root), '/');
        $this->autoloadPath = $this->root . '/nesh/src/autoload.php';
        $this->schemaPath = $this->root . '/nesh/src/schema.php';
    }
    public function buildAllSql(?string $outputPath = null): array
    {
        $outputPath = $this->resolveOutputPath($outputPath);
        $sections = [];
        $fileCount = 0;
        $applications = [];
        foreach (self::APP_ORDER as $folder) {
            $app = App::get($folder);
            if (!$app instanceof App || $app->database === null) {
                continue;
            }
            $databasePath = $app->paths['database'];
            if (!is_dir($databasePath)) {
                continue;
            }
            $files = glob($databasePath . '/*.sql') ?: [];
            if ($files === []) {
                continue;
            }
            sort($files, SORT_NATURAL);
            $applications[] = $folder;
            $sections[] = '-- ============================================================';
            $sections[] = '-- Application: ' . $app->name;
            $sections[] = '-- Folder: ' . $folder;
            $sections[] = '-- Database: ' . $app->database;
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
    public function applyOne(string $identifier, string $newDatabase): array
    {
        $newDatabase = $this->validateDatabaseName($newDatabase);
        $app = App::get($identifier);
        if (!$app instanceof App) {
            throw new \InvalidArgumentException(
                'Unknown application: ' . $identifier . '.'
            );
        }
        if ($app->database === null) {
            throw new \InvalidArgumentException(
                'Application "' . $app->name . '" has no database.'
            );
        }
        if ($app->database === $newDatabase) {
            return $this->unchangedResult([$app], $newDatabase, false);
        }
        return $this->execute(
            [[
                'app' => $app,
                'from' => $app->database,
                'to' => $newDatabase,
            ]],
            false,
            $newDatabase
        );
    }
    public function validateDatabaseName(string $name): string
    {
        $name = trim($name);
        if ($name === '') {
            throw new \InvalidArgumentException('Missing database name.');
        }
        if (
            preg_match('/[\s\'";`#]/', $name) === 1
            || str_contains($name, '--')
            || str_contains($name, '/*')
            || str_contains($name, '*/')
        ) {
            throw new \InvalidArgumentException('Invalid database name.');
        }
        if (!preg_match('/^[A-Za-z0-9_$]{1,64}$/', $name)) {
            throw new \InvalidArgumentException('Invalid database name.');
        }
        return $name;
    }
    private function resolveOutputPath(?string $outputPath): string
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
    private function execute(array $migrations, bool $all, string $newDatabase): array
    {
        $registry = $this->readAutoloadRegistry();
        $replacementMap = [];
        foreach ($migrations as $migration) {
            $replacementMap[$migration['from']] = $migration['to'];
        }
        uksort(
            $replacementMap,
            static fn(string $a, string $b): int => strlen($b) <=> strlen($a)
        );
        $autoload = file_get_contents($this->autoloadPath);
        if ($autoload === false) {
            throw new \RuntimeException('Unable to read autoload.php.');
        }
        $updatedAutoload = $autoload;
        $autoloadChanged = false;
        foreach ($migrations as $migration) {
            $folder = $migration['app']->folder;
            $global = $registry[$folder]['global'] ?? null;
            if ($global === null) {
                throw new \RuntimeException(
                    'Unable to locate autoload entry for "' . $folder . '".'
                );
            }
            $nextAutoload = $this->replaceAutoloadDatabase(
                $updatedAutoload,
                $global,
                $migration['to']
            );
            if ($nextAutoload !== $updatedAutoload) {
                $updatedAutoload = $nextAutoload;
                $autoloadChanged = true;
            }
        }
        $schema = file_get_contents($this->schemaPath);
        if ($schema === false) {
            throw new \RuntimeException('Unable to read schema.php.');
        }
        $updatedSchema = $schema;
        $schemaChanged = false;
        foreach ($migrations as $migration) {
            $constant = self::SCHEMA_CONSTANTS[$migration['app']->folder] ?? null;
            if ($constant === null) {
                continue;
            }
            $nextSchema = $this->replaceSchemaConstant(
                $updatedSchema,
                $constant,
                $migration['to']
            );
            if ($nextSchema !== $updatedSchema) {
                $updatedSchema = $nextSchema;
                $schemaChanged = true;
            }
        }
        $fileStats = $this->migrateProjectFiles($replacementMap);
        if ($autoloadChanged) {
            file_put_contents($this->autoloadPath, $updatedAutoload);
        }
        if ($schemaChanged) {
            file_put_contents($this->schemaPath, $updatedSchema);
        }
        return [
            'all' => $all,
            'unchanged' => false,
            'new_database' => $newDatabase,
            'migrations' => array_map(
                static fn(array $migration): array => [
                    'name' => $migration['app']->name,
                    'folder' => $migration['app']->folder,
                    'from' => $migration['from'],
                    'to' => $migration['to'],
                ],
                $migrations
            ),
            'updated' => [
                'autoload' => $autoloadChanged,
                'schema' => $schemaChanged,
                'php' => $fileStats['php'],
                'sql' => $fileStats['sql'],
                'other' => $fileStats['other'],
            ],
        ];
    }
    private function unchangedResult(
        array $apps,
        string $database,
        bool $all
    ): array {
        return [
            'all' => $all,
            'unchanged' => true,
            'new_database' => $database,
            'migrations' => array_map(
                static fn(App $app): array => [
                    'name' => $app->name,
                    'folder' => $app->folder,
                    'from' => $app->database,
                    'to' => $database,
                ],
                $apps
            ),
            'updated' => [
                'autoload' => false,
                'schema' => false,
                'php' => 0,
                'sql' => 0,
                'other' => 0,
            ],
        ];
    }
    private function readAutoloadRegistry(): array
    {
        $content = file_get_contents($this->autoloadPath);
        if ($content === false) {
            return [];
        }
        $registry = [];
        $pattern = '/\$GLOBALS\[\'([^\']+)\'\]\s*=\s*new App\(\s*\'[^\']*\',\s*\'[^\']*\',\s*\'([^\']+)\',\s*(\'[^\']*\'|null),\s*\'[^\']*\'\s*\);/';
        if (!preg_match_all($pattern, $content, $matches, PREG_SET_ORDER)) {
            return $registry;
        }
        foreach ($matches as $match) {
            $registry[$match[2]] = [
                'global' => $match[1],
                'database' => $match[3] === 'null'
                    ? null
                    : trim($match[3], "'"),
            ];
        }
        return $registry;
    }
    private function replaceAutoloadDatabase(
        string $content,
        string $globalKey,
        string $database
    ): string {
        $pattern = '/(\$GLOBALS\[\'' . preg_quote($globalKey, '/')
            . '\'\]\s*=\s*new App\(\'[^\']*\',\s*\'[^\']*\',\s*\'[^\']*\',\s*)(\'[^\']*\'|null)/';
        return preg_replace(
            $pattern,
            '$1\'' . $database . '\'',
            $content,
            1
        ) ?? $content;
    }
    private function replaceSchemaConstant(
        string $content,
        string $constant,
        string $database
    ): string {
        $pattern = '/public const ' . preg_quote($constant, '/')
            . " = '[^']*';/";
        return preg_replace(
            $pattern,
            "public const {$constant} = '{$database}';",
            $content,
            1
        ) ?? $content;
    }
    private function migrateProjectFiles(array $replacementMap): array
    {
        if ($replacementMap === []) {
            return ['php' => 0, 'sql' => 0, 'other' => 0];
        }
        $stats = ['php' => 0, 'sql' => 0, 'other' => 0];
        $skipFiles = [
            str_replace('\\', '/', realpath($this->autoloadPath) ?: $this->autoloadPath),
            str_replace('\\', '/', realpath($this->schemaPath) ?: $this->schemaPath),
            str_replace('\\', '/', realpath($this->root . '/nesh/src/database-cli.php') ?: $this->root . '/nesh/src/database-cli.php'),
            str_replace('\\', '/', realpath($this->root . '/nesh/src/deployment.php') ?: $this->root . '/nesh/src/deployment.php'),
            str_replace('\\', '/', realpath($this->root . '/nesh/cli/db.php') ?: $this->root . '/nesh/cli/db.php'),
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
            foreach ($replacementMap as $from => $to) {
                $updated = str_replace($from, $to, $updated);
            }
            if ($updated === $original) {
                continue;
            }
            file_put_contents($file, $updated);
            $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if ($extension === 'php') {
                $stats['php']++;
            } elseif ($extension === 'sql') {
                $stats['sql']++;
            } else {
                $stats['other']++;
            }
        }
        return $stats;
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
}
