<?php
namespace Nesh;
class Schema
{
    public function __construct(string $folder)
    {
        if (!is_dir($folder)) {
            Response::error('Schema folder not found');
        }
        Connection::start();
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator(
                $folder,
                \RecursiveDirectoryIterator::SKIP_DOTS
            )
        );
        $files = [];
        foreach ($iterator as $file) {
            if ($file->isFile() && strtolower($file->getExtension()) === 'sql') {
                $files[] = $file->getPathname();
            }
        }
        sort($files, SORT_NATURAL);
        foreach ($files as $file) {
            $sql = trim((string) file_get_contents($file));
            if ($sql !== '') {
                Query::multi($sql);
            }
        }
    }
}