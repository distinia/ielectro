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
    private const SOURCE_DATABASES = [
        'ielectro_account',
        'ielectro_admin',
        'ielectro_dyscover',
        'ielectro_dominions',
    ];
    private const CANONICAL_DATABASES = [
        'account' => 'ielectro_account',
        'admin' => 'ielectro_admin',
        'dyscover' => 'ielectro_dyscover',
        'dominions' => 'ielectro_dominions',
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
    public function applyUnified(string $database): array
    {
        $database = $this->validateDatabaseName($database);
        $registry = $this->readAutoloadRegistry();
        $autoloadMigrations = [];
        foreach (self::APP_ORDER as $folder) {
            $entry = $registry[$folder] ?? null;
            if ($entry === null || $entry['database'] === null) {
                continue;
            }
            if ($entry['database'] === $database) {
                continue;
            }
            $autoloadMigrations[] = [
                'folder' => $folder,
                'name' => $entry['name'],
                'from' => $entry['database'],
                'to' => $database,
            ];
        }
        $replacementMap = $this->buildUnifiedReplacementMap($database, $registry);
        return $this->execute($autoloadMigrations, $replacementMap, true, $database);
    }
    public function syncDeploymentReferences(): array
    {
        $registry = $this->readAutoloadRegistry();
        $database = $this->unifiedDatabaseName($registry);
        if ($database === null) {
            return [
                'synced' => false,
                'database' => null,
                'updated' => [
                    'php' => 0,
                    'sql' => 0,
                    'other' => 0,
                ],
            ];
        }
        $fileStats = $this->migrateProjectFiles(
            $this->buildUnifiedReplacementMap($database, $registry)
        );
        return [
            'synced' => true,
            'database' => $database,
            'updated' => $fileStats,
        ];
    }
    public function applyOne(string $identifier, string $newDatabase): array
    {
        $newDatabase = $this->validateDatabaseName($newDatabase);
        $registry = $this->readAutoloadRegistry();
        $entry = $registry[$identifier] ?? null;
        if ($entry === null) {
            throw new \InvalidArgumentException(
                'Unknown application: ' . $identifier . '.'
            );
        }
        if ($entry['database'] === null) {
            throw new \InvalidArgumentException(
                'Application "' . $entry['name'] . '" has no database.'
            );
        }
        if ($entry['database'] === $newDatabase) {
            return $this->execute(
                [],
                $this->buildSingleReplacementMap($identifier, $newDatabase),
                false,
                $newDatabase,
                [$identifier]
            );
        }
        $replacementMap = [$entry['database'] => $newDatabase];
        $canonical = self::CANONICAL_DATABASES[$identifier] ?? null;
        if ($canonical !== null && $canonical !== $newDatabase) {
            $replacementMap[$canonical] = $newDatabase;
        }
        return $this->execute(
            [[
                'folder' => $identifier,
                'name' => $entry['name'],
                'from' => $entry['database'],
                'to' => $newDatabase,
            ]],
            $this->sortReplacementMap($replacementMap),
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
    private function execute(
        array $autoloadMigrations,
        array $replacementMap,
        bool $all,
        string $newDatabase,
        ?array $reportFolders = null
    ): array {
        $registry = $this->readAutoloadRegistry();
        $autoload = file_get_contents($this->autoloadPath);
        if ($autoload === false) {
            throw new \RuntimeException('Unable to read autoload.php.');
        }
        $updatedAutoload = $autoload;
        $autoloadChanged = false;
        foreach ($autoloadMigrations as $migration) {
            $folder = $migration['folder'];
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
        foreach ($autoloadMigrations as $migration) {
            $constant = self::SCHEMA_CONSTANTS[$migration['folder']] ?? null;
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
        $reportMigrations = $autoloadMigrations;
        if ($reportMigrations === [] && $reportFolders !== null) {
            $reportMigrations = $this->reportMigrations($registry, $newDatabase, $reportFolders);
        } elseif ($reportMigrations === [] && $all) {
            $reportMigrations = $this->reportMigrations($registry, $newDatabase, self::APP_ORDER);
        }
        $unchanged = !$autoloadChanged
            && !$schemaChanged
            && $fileStats['php'] === 0
            && $fileStats['sql'] === 0
            && $fileStats['other'] === 0;
        return [
            'all' => $all,
            'unchanged' => $unchanged,
            'new_database' => $newDatabase,
            'migrations' => array_map(
                static fn(array $migration): array => [
                    'name' => $migration['name'],
                    'folder' => $migration['folder'],
                    'from' => $migration['from'],
                    'to' => $migration['to'],
                ],
                $reportMigrations
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
    private function reportMigrations(
        array $registry,
        string $database,
        array $folders
    ): array {
        $migrations = [];
        foreach ($folders as $folder) {
            $entry = $registry[$folder] ?? null;
            if ($entry === null || $entry['database'] === null) {
                continue;
            }
            $migrations[] = [
                'name' => $entry['name'],
                'folder' => $folder,
                'from' => $entry['database'],
                'to' => $database,
            ];
        }
        return $migrations;
    }
    private function buildUnifiedReplacementMap(
        string $database,
        array $registry
    ): array {
        $sources = self::SOURCE_DATABASES;
        foreach ($registry as $entry) {
            if ($entry['database'] === null) {
                continue;
            }
            $sources[] = $entry['database'];
        }
        $map = [];
        foreach (array_unique($sources) as $source) {
            if ($source !== $database) {
                $map[$source] = $database;
            }
        }
        return $this->sortReplacementMap($map);
    }
    private function buildSingleReplacementMap(
        string $folder,
        string $database
    ): array {
        $canonical = self::CANONICAL_DATABASES[$folder] ?? null;
        if ($canonical === null || $canonical === $database) {
            return [];
        }
        return $this->sortReplacementMap([$canonical => $database]);
    }
    private function sortReplacementMap(array $map): array
    {
        uksort(
            $map,
            static fn(string $a, string $b): int => strlen($b) <=> strlen($a)
        );
        return $map;
    }
    private function unifiedDatabaseName(array $registry): ?string
    {
        $names = [];
        foreach (self::APP_ORDER as $folder) {
            $entry = $registry[$folder] ?? null;
            if ($entry === null || $entry['database'] === null) {
                continue;
            }
            $names[] = $entry['database'];
        }
        if ($names === []) {
            return null;
        }
        $unique = array_values(array_unique($names));
        return count($unique) === 1 ? $unique[0] : null;
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
            str_replace('\\', '/', realpath($this->root . '/nesh/cli/database.php') ?: $this->root . '/nesh/cli/database.php'),
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
