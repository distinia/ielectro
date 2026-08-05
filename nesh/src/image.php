<?php
namespace Nesh;
class Image extends File
{
    protected ?int $width = null;
    protected ?int $height = null;
    protected ?\GdImage $resource = null;
    protected int $quality = 90;
    protected ?string $targetExtension = null;
    public static function open(string $path): static
    {
        $image = parent::open($path);
        if (!$image->verify()) {
            Response::badRequest('Invalid image');
        }
        return $image;
    }
    public static function upload(
        array $file,
        ?string $name = null,
        bool $overwrite = false
    ): static {
        $image = parent::upload($file, $name, $overwrite);
        if (!$image->verify()) {
            $image->delete();
            Response::badRequest('Invalid image');
        }
        return $image;
    }
    protected function refreshMetadata(): void
    {
        parent::refreshMetadata();
        if (!$this->exists()) {
            $this->width = null;
            $this->height = null;
            return;
        }
        $size = getimagesize($this->path);
        $this->width = (int) ($size[0] ?? 0);
        $this->height = (int) ($size[1] ?? 0);
        if ($size !== false && isset($size['mime'])) {
            $this->mime = $size['mime'];
        }
    }
    public function width(): int
    {
        return $this->width ?? 0;
    }
    public function height(): int
    {
        return $this->height ?? 0;
    }
    public function verify(): bool
    {
        return $this->exists() && getimagesize($this->path) !== false;
    }
    protected function loadResource(): \GdImage
    {
        if ($this->resource instanceof \GdImage) {
            return $this->resource;
        }
        $resource = match ($this->extension()) {
            'jpg', 'jpeg' => imagecreatefromjpeg($this->path),
            'png' => imagecreatefrompng($this->path),
            'gif' => imagecreatefromgif($this->path),
            'webp' => imagecreatefromwebp($this->path),
            'bmp' => imagecreatefrombmp($this->path),
            'avif' => function_exists('imagecreatefromavif')
                ? imagecreatefromavif($this->path)
                : false,
            default => false,
        };
        if ($resource === false) {
            Response::error('Unable to read image');
        }
        $this->resource = $resource;
        return $this->resource;
    }
    protected function releaseResource(): void
    {
        if ($this->resource instanceof \GdImage) {
            imagedestroy($this->resource);
            $this->resource = null;
        }
    }
    protected function persist(): void
    {
        if (!$this->dirty || !$this->resource instanceof \GdImage) {
            parent::persist();
            return;
        }
        self::makeDirectory(dirname($this->path));
        $extension = $this->targetExtension ?? $this->extension();
        $saved = match ($extension) {
            'jpg', 'jpeg' => imagejpeg($this->resource, $this->path, $this->quality),
            'png' => imagepng($this->resource, $this->path),
            'gif' => imagegif($this->resource, $this->path),
            'webp' => imagewebp($this->resource, $this->path, $this->quality),
            'bmp' => imagebmp($this->resource, $this->path),
            'avif' => function_exists('imageavif')
                ? imageavif($this->resource, $this->path, $this->quality)
                : false,
            default => false,
        };
        if ($saved === false) {
            Response::error('Unable to save image');
        }
        $this->dirty = false;
        $this->releaseResource();
        parent::persist();
    }
    public function compress(int $quality = 80): static
    {
        $this->quality = max(1, min(100, $quality));
        $this->loadResource();
        $this->dirty = true;
        return $this;
    }
    public function convert(string $format): static
    {
        $this->targetExtension = strtolower($format);
        $basename = $this->basename() ?? Generate::token();
        $this->path = self::joinPath(
            dirname($this->path),
            $basename . '.' . $this->targetExtension
        );
        $this->loadResource();
        $this->dirty = true;
        return $this;
    }
    public function resize(int $width, int $height): static
    {
        $source = $this->loadResource();
        $canvas = imagecreatetruecolor($width, $height);
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        imagecopyresampled(
            $canvas,
            $source,
            0,
            0,
            0,
            0,
            $width,
            $height,
            imagesx($source),
            imagesy($source)
        );
        $this->releaseResource();
        $this->resource = $canvas;
        $this->width = $width;
        $this->height = $height;
        $this->dirty = true;
        return $this;
    }
    public function crop(int $x, int $y, int $width, int $height): static
    {
        $source = $this->loadResource();
        $crop = imagecrop($source, [
            'x' => $x,
            'y' => $y,
            'width' => $width,
            'height' => $height,
        ]);
        if ($crop === false) {
            Response::error('Unable to crop image');
        }
        $this->releaseResource();
        $this->resource = $crop;
        $this->width = $width;
        $this->height = $height;
        $this->dirty = true;
        return $this;
    }
    public function rotate(float $angle): static
    {
        $source = $this->loadResource();
        $rotate = imagerotate($source, $angle, 0);
        if ($rotate === false) {
            Response::error('Unable to rotate image');
        }
        $this->releaseResource();
        $this->resource = $rotate;
        $this->width = imagesx($rotate);
        $this->height = imagesy($rotate);
        $this->dirty = true;
        return $this;
    }
    public function flip(int $mode = IMG_FLIP_HORIZONTAL): static
    {
        $source = $this->loadResource();
        imageflip($source, $mode);
        $this->dirty = true;
        return $this;
    }
    public function fit(int $maxWidth, int $maxHeight): static
    {
        $source = $this->loadResource();
        $width = imagesx($source);
        $height = imagesy($source);
        $ratio = min($maxWidth / $width, $maxHeight / $height, 1);
        return $this->resize(
            (int) round($width * $ratio),
            (int) round($height * $ratio)
        );
    }
    public function cover(int $width, int $height): static
    {
        $source = $this->loadResource();
        $sourceWidth = imagesx($source);
        $sourceHeight = imagesy($source);
        $ratio = max($width / $sourceWidth, $height / $sourceHeight);
        $resizeWidth = (int) ceil($sourceWidth * $ratio);
        $resizeHeight = (int) ceil($sourceHeight * $ratio);
        $canvas = imagecreatetruecolor($width, $height);
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        imagecopyresampled(
            $canvas,
            $source,
            (int) -(($resizeWidth - $width) / 2),
            (int) -(($resizeHeight - $height) / 2),
            0,
            0,
            $resizeWidth,
            $resizeHeight,
            $sourceWidth,
            $sourceHeight
        );
        $this->releaseResource();
        $this->resource = $canvas;
        $this->width = $width;
        $this->height = $height;
        $this->dirty = true;
        return $this;
    }
    public function thumbnail(int $size = 300): static
    {
        return $this->fit($size, $size);
    }
    public function save(?string $directory = null): static
    {
        if ($this->resource === null && $this->dirty) {
            $this->loadResource();
        }
        return parent::save($directory);
    }
    public function __destruct()
    {
        $this->releaseResource();
    }
}
