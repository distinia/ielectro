<?php
namespace Nesh;
class Pdf extends File
{
    protected ?int $pages = null;
    protected ?string $author = null;
    protected ?string $title = null;
    public static function open(string $path): static
    {
        $pdf = parent::open($path);
        if (!$pdf->verify()) {
            Response::badRequest('Invalid PDF');
        }
        return $pdf;
    }
    public static function upload(
        array $file,
        ?string $name = null,
        bool $overwrite = false
    ): static {
        $pdf = parent::upload($file, $name, $overwrite);
        if (!$pdf->verify()) {
            $pdf->delete();
            Response::badRequest('Invalid PDF');
        }
        return $pdf;
    }
    public static function uploadTo(
        array $file,
        string $directory,
        ?string $name = null,
        bool $overwrite = false
    ): static {
        $pdf = parent::uploadTo($file, $directory, $name, $overwrite);
        if (!$pdf->verify()) {
            $pdf->delete();
            Response::badRequest('Invalid PDF');
        }
        return $pdf;
    }
    protected function refreshMetadata(): void
    {
        parent::refreshMetadata();
        if (!$this->verify()) {
            $this->pages = null;
            $this->author = null;
            $this->title = null;
            return;
        }
        $this->pages = $this->probePages();
        $this->author = $this->probeInfo('/Author\s*\((.*?)\)/s');
        $this->title = $this->probeInfo('/Title\s*\((.*?)\)/s');
    }
    public function verify(): bool
    {
        if (!$this->exists()) {
            return false;
        }
        $handle = fopen($this->path, 'rb');
        if ($handle === false) {
            return false;
        }
        $header = fread($handle, 5);
        fclose($handle);
        return $header === '%PDF-';
    }
    public function pages(): ?int
    {
        return $this->pages;
    }
    public function author(): ?string
    {
        return $this->author;
    }
    public function title(): ?string
    {
        return $this->title;
    }
    protected function probePages(): ?int
    {
        $content = self::read($this->path);
        if ($content === null) {
            return null;
        }
        if (preg_match_all('/\/Type[\s]*\/Page[^s]/', $content, $matches)) {
            return count($matches[0]);
        }
        if (preg_match('/\/N\s+(\d+)/', $content, $match)) {
            return (int) $match[1];
        }
        return null;
    }
    protected function probeInfo(string $pattern): ?string
    {
        $content = self::read($this->path);
        if ($content === null || !preg_match($pattern, $content, $match)) {
            return null;
        }
        return $this->decodePdfString($match[1]);
    }
    protected function decodePdfString(string $value): string
    {
        return trim(str_replace(['\\(', '\\)', '\\\\'], ['(', ')', '\\'], $value));
    }
}
