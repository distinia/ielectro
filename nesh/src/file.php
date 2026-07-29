<?php
namespace Nesh;
class File
{
    protected string $path;
    protected ?string $filename = null;
    protected ?string $extension = null;
    protected ?string $mime = null;
    protected ?int $size = null;
    protected bool $dirty = false;
    protected function __construct(string $path)
    {
        $this->path = $path;
        $this->refreshMetadata();
    }
    public static function open(string $path): static
    {
        if (!self::pathExists($path)) {
            Response::notFound('File not found');
        }
        return new static($path);
    }
    public static function upload(
        array $file,
        ?string $name = null,
        bool $overwrite = false
    ): static {
        return new static(self::storeUpload($file, TEMP_PATH, $name, $overwrite));
    }
    protected static function storeUpload(
        array $file,
        string $directory,
        ?string $name = null,
        bool $overwrite = false
    ): string {
        if (
            !isset($file['error'], $file['tmp_name'], $file['name']) ||
            $file['error'] !== UPLOAD_ERR_OK ||
            !is_uploaded_file($file['tmp_name'])
        ) {
            Response::badRequest('Invalid file');
        }
        self::makeDirectory($directory);
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $filename = $name ?? Identifier::token();
        if ($extension !== '') {
            $filename .= '.' . $extension;
        }
        $path = self::joinPath($directory, $filename);
        if (!$overwrite && self::pathExists($path)) {
            Response::conflict('File already exists');
        }
        if (!move_uploaded_file($file['tmp_name'], $path)) {
            Response::error('Unable to upload file');
        }
        clearstatcache();
        return $path;
    }
    protected function refreshMetadata(): void
    {
        if (!self::pathExists($this->path)) {
            $this->filename = null;
            $this->extension = null;
            $this->mime = null;
            $this->size = null;
            return;
        }
        clearstatcache(false, $this->path);
        $this->filename = basename($this->path);
        $extension = pathinfo($this->path, PATHINFO_EXTENSION);
        $this->extension = $extension !== '' ? strtolower($extension) : null;
        $this->mime = mime_content_type($this->path) ?: null;
        $this->size = filesize($this->path) ?: 0;
    }
    protected function persist(): void
    {
        if (!$this->dirty) {
            return;
        }
        $this->dirty = false;
    }
    public function save(?string $directory = null): static
    {
        $this->persist();
        if ($directory !== null) {
            self::makeDirectory($directory);
            $destination = self::joinPath($directory, $this->filename());
            if ($destination !== $this->path) {
                if (!self::pathExists($this->path) || !rename($this->path, $destination)) {
                    Response::error('Unable to save file');
                }
                $this->path = $destination;
            }
        }
        $this->refreshMetadata();
        return $this;
    }
    public function delete(): bool
    {
        if (!self::pathExists($this->path)) {
            return false;
        }
        $deleted = unlink($this->path);
        clearstatcache();
        if ($deleted) {
            $this->refreshMetadata();
        }
        return $deleted;
    }
    public function copy(string $destination, bool $overwrite = false): static
    {
        if (!self::copyPath($this->path, $destination, $overwrite)) {
            Response::error('Unable to copy file');
        }
        return new static($destination);
    }
    public function move(string $destination, bool $overwrite = false): static
    {
        if (!self::movePath($this->path, $destination, $overwrite)) {
            Response::error('Unable to move file');
        }
        $this->path = $destination;
        $this->refreshMetadata();
        return $this;
    }
    public function rename(string $name, bool $overwrite = false): static
    {
        $filename = $name;
        if ($this->extension !== null && !str_ends_with(strtolower($name), '.' . $this->extension)) {
            $filename .= '.' . $this->extension;
        }
        return $this->move(
            self::joinPath(dirname($this->path), $filename),
            $overwrite
        );
    }
    public function exists(): bool
    {
        return self::pathExists($this->path);
    }
    public function filename(): ?string
    {
        return basename($this->path);
    }
    public function basename(): ?string
    {
        return pathinfo($this->path, PATHINFO_FILENAME) ?: null;
    }
    public function extension(): ?string
    {
        $extension = pathinfo($this->path, PATHINFO_EXTENSION);
        return $extension !== '' ? strtolower($extension) : $this->extension;
    }
    public function mime(): ?string
    {
        return $this->mime;
    }
    public function hash(string $algorithm = 'sha256'): ?string
    {
        if (!$this->exists()) {
            return null;
        }
        if (!in_array($algorithm, hash_algos(), true)) {
            Response::badRequest('Invalid hash algorithm');
        }
        return hash_file($algorithm, $this->path);
    }
    public function size(): ?int
    {
        return $this->size;
    }
    public function directory(): ?string
    {
        return $this->exists() ? dirname($this->path) : null;
    }
    public function verify(): bool
    {
        return $this->exists() && $this->size > 0;
    }
    public function path(): string
    {
        return $this->path;
    }
    public function temp(): string
    {
        self::makeDirectory(TEMP_PATH);
        $extension = $this->extension !== null ? '.' . $this->extension : '';
        return self::joinPath(TEMP_PATH, Identifier::token() . $extension);
    }
    public static function create(string $path, string $content = ''): bool
    {
        self::makeDirectory(dirname($path));
        return file_put_contents($path, $content, LOCK_EX) !== false;
    }
    public static function read(string $path): ?string
    {
        return self::pathExists($path)
            ? \file_get_contents($path)
            : null;
    }
    public static function write(string $path, string $content): bool
    {
        return self::pathExists($path)
            ? \file_put_contents($path, $content, LOCK_EX) !== false
            : false;
    }
    public static function append(string $path, string $content): bool
    {
        return self::pathExists($path)
            ? \file_put_contents($path, $content, \FILE_APPEND | \LOCK_EX) !== false
            : false;
    }
    public static function remove(string $path): bool
    {
        if (!self::pathExists($path)) {
            return false;
        }
        $deleted = unlink($path);
        clearstatcache();
        return $deleted;
    }
    public static function pathExists(string $path): bool
    {
        return file_exists($path);
    }
    public static function copyPath(string $source, string $destination, bool $overwrite = false): bool
    {
        if (!self::pathExists($source)) {
            return false;
        }
        self::makeDirectory(dirname($destination));
        if (!$overwrite && self::pathExists($destination)) {
            return false;
        }
        $copied = copy($source, $destination);
        clearstatcache();
        return $copied;
    }
    public static function movePath(string $source, string $destination, bool $overwrite = false): bool
    {
        if (!self::pathExists($source)) {
            return false;
        }
        self::makeDirectory(dirname($destination));
        if (!$overwrite && self::pathExists($destination)) {
            return false;
        }
        $moved = rename($source, $destination);
        clearstatcache();
        return $moved;
    }
    public static function filenameOf(string $path): ?string
    {
        return self::pathExists($path)
            ? \basename($path)
            : null;
    }
    public static function basenameOf(string $path): ?string
    {
        return self::pathExists($path)
            ? \pathinfo($path, PATHINFO_FILENAME)
            : null;
    }
    public static function directoryOf(string $path): ?string
    {
        return self::pathExists($path)
            ? dirname($path)
            : null;
    }
    public static function extensionOf(string $path): ?string
    {
        if (!self::pathExists($path)) {
            return null;
        }
        $extension = pathinfo($path, PATHINFO_EXTENSION);
        return $extension !== ''
            ? strtolower($extension)
            : null;
    }
    public static function mimeOf(string $path): ?string
    {
        return self::pathExists($path)
            ? \mime_content_type($path)
            : null;
    }
    public static function sizeOf(string $path): ?int
    {
        if (!self::pathExists($path)) {
            return null;
        }
        clearstatcache(false, $path);
        return filesize($path) ?: 0;
    }
    public static function hashOf(string $path, string $algorithm = 'sha256'): ?string
    {
        if (!self::pathExists($path)) {
            return null;
        }
        if (!in_array($algorithm, hash_algos(), true)) {
            Response::badRequest('Invalid hash algorithm');
        }
        return hash_file($algorithm, $path);
    }
    public static function isImage(string $path): bool
    {
        return str_starts_with(self::mimeOf($path) ?? '', 'image/');
    }
    public static function isVideo(string $path): bool
    {
        return str_starts_with(self::mimeOf($path) ?? '', 'video/');
    }
    public static function isAudio(string $path): bool
    {
        return str_starts_with(self::mimeOf($path) ?? '', 'audio/');
    }
    public static function isPdf(string $path): bool
    {
        return self::mimeOf($path) === 'application/pdf';
    }
    public static function touch(string $path): bool
    {
        return self::pathExists($path)
            ? \touch($path)
            : false;
    }
    public static function makeDirectory(string $path, int $permissions = 0755): bool
    {
        return is_dir($path)
            ? true
            : \mkdir($path, $permissions, true);
    }
    public static function deleteDirectory(string $path): bool
    {
        if (!is_dir($path)) {
            return false;
        }
        foreach (scandir($path) as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $item = self::joinPath($path, $item);
            if (is_dir($item)) {
                self::deleteDirectory($item);
                continue;
            }
            unlink($item);
        }
        clearstatcache();
        return rmdir($path);
    }
    public static function emptyDirectory(string $path): bool
    {
        if (!is_dir($path)) {
            return false;
        }
        foreach (scandir($path) as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $item = self::joinPath($path, $item);
            if (is_dir($item)) {
                self::deleteDirectory($item);
                continue;
            }
            unlink($item);
        }
        clearstatcache();
        return true;
    }
    public static function files(string $directory): array
    {
        if (!is_dir($directory)) {
            return [];
        }
        return array_values(array_filter(
            scandir($directory),
            fn(string $file) =>
                $file !== '.' &&
                $file !== '..' &&
                is_file(self::joinPath($directory, $file))
        ));
    }
    public static function directories(string $directory): array
    {
        if (!is_dir($directory)) {
            return [];
        }
        return array_values(array_filter(
            scandir($directory),
            fn(string $file) =>
                $file !== '.' &&
                $file !== '..' &&
                is_dir(self::joinPath($directory, $file))
        ));
    }
    public static function scan(string $directory): array
    {
        if (!is_dir($directory)) {
            return [];
        }
        return array_values(array_diff(
            scandir($directory),
            ['.', '..']
        ));
    }
    public static function modified(string $path): ?int
    {
        return self::pathExists($path)
            ? \filemtime($path)
            : null;
    }
    public static function created(string $path): ?int
    {
        return self::pathExists($path)
            ? \filectime($path)
            : null;
    }
    protected static function joinPath(string $directory, string $filename): string
    {
        return rtrim($directory, '/\\')
            . DIRECTORY_SEPARATOR
            . ltrim($filename, '/\\');
    }
}
