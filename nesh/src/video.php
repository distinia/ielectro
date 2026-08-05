<?php
namespace Nesh;
class Video extends File
{
    use UsesFfmpeg;
    protected ?float $duration = null;
    protected ?int $bitrate = null;
    protected ?float $fps = null;
    protected ?string $codec = null;
    protected ?int $width = null;
    protected ?int $height = null;
    protected ?string $thumbnailPath = null;
    public static function open(string $path): static
    {
        $video = parent::open($path);
        if (!$video->verify()) {
            Response::badRequest('Invalid video');
        }
        return $video;
    }
    public static function upload(
        array $file,
        ?string $name = null,
        bool $overwrite = false
    ): static {
        $video = parent::upload($file, $name, $overwrite);
        if (!$video->verify()) {
            $video->delete();
            Response::badRequest('Invalid video');
        }
        return $video;
    }
    protected function refreshMetadata(): void
    {
        parent::refreshMetadata();
        if (!$this->verify()) {
            $this->duration = null;
            $this->bitrate = null;
            $this->fps = null;
            $this->codec = null;
            $this->width = null;
            $this->height = null;
            return;
        }
        $this->duration = $this->probeDuration();
        $this->bitrate = $this->probeBitrate();
        $this->fps = $this->probeFps();
        $this->codec = $this->probeCodec();
        $resolution = $this->probeResolution();
        $this->width = $resolution['width'] ?? null;
        $this->height = $resolution['height'] ?? null;
    }
    public function verify(): bool
    {
        return $this->exists() && self::isVideo($this->path);
    }
    public function duration(): ?float
    {
        return $this->duration;
    }
    public function bitrate(): ?int
    {
        return $this->bitrate;
    }
    public function fps(): ?float
    {
        return $this->fps;
    }
    public function codec(): ?string
    {
        return $this->codec;
    }
    public function width(): ?int
    {
        return $this->width;
    }
    public function height(): ?int
    {
        return $this->height;
    }
    protected function probeDuration(): ?float
    {
        $value = self::ffprobeValue(
            $this->path,
            '-show_entries format=duration -of default=noprint_wrappers=1:nokey=1'
        );
        return $value !== null ? (float) $value : null;
    }
    protected function probeBitrate(): ?int
    {
        $value = self::ffprobeValue(
            $this->path,
            '-show_entries format=bit_rate -of default=noprint_wrappers=1:nokey=1'
        );
        return $value !== null ? (int) $value : null;
    }
    protected function probeCodec(): ?string
    {
        return self::ffprobeValue(
            $this->path,
            '-select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1'
        );
    }
    protected function probeFps(): ?float
    {
        $rate = self::ffprobeValue(
            $this->path,
            '-select_streams v:0 -show_entries stream=r_frame_rate -of default=noprint_wrappers=1:nokey=1'
        );
        if ($rate === null) {
            return null;
        }
        if (!str_contains($rate, '/')) {
            return (float) $rate;
        }
        [$a, $b] = explode('/', $rate);
        return (float) $b === 0.0 ? null : \round((float) $a / (float) $b, 2);
    }
    protected function probeResolution(): ?array
    {
        $output = self::ffprobeValue(
            $this->path,
            '-select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0'
        );
        if ($output === null || !str_contains($output, 'x')) {
            return null;
        }
        [$width, $height] = explode('x', $output);
        return [
            'width' => (int) $width,
            'height' => (int) $height,
        ];
    }
    protected function replaceWith(string $destination): void
    {
        if ($destination !== $this->path && self::pathExists($this->path)) {
            self::remove($this->path);
        }
        $this->path = $destination;
        $this->dirty = true;
        $this->refreshMetadata();
    }
    protected function runOutput(string $command, string $extension): void
    {
        $destination = self::joinPath(TEMP_PATH, Generate::token() . '.' . ltrim($extension, '.'));
        self::makeDirectory(TEMP_PATH);
        if (!self::runFfmpeg($command . ' ' . escapeshellarg($destination))) {
            Response::error('Video processing failed');
        }
        $this->replaceWith($destination);
    }
    public function convert(string $format = 'mp4', string $codec = 'libx264', int $quality = 23): static
    {
        $command =
            'ffmpeg -y -i ' . escapeshellarg($this->path) . ' ' .
            '-c:v ' . escapeshellarg($codec) . ' ' .
            '-crf ' . (int) $quality . ' ' .
            '-preset medium -c:a aac -b:a 128k';
        $this->runOutput($command, $format);
        return $this;
    }
    public function compress(int $quality = 28): static
    {
        return $this->convert('mp4', 'libx264', $quality);
    }
    public function resize(int $width, int $height, int $quality = 23): static
    {
        $command =
            'ffmpeg -y -i ' . escapeshellarg($this->path) . ' ' .
            '-vf scale=' . $width . ':' . $height . ' ' .
            '-c:v libx264 -crf ' . (int) $quality . ' ' .
            '-preset medium -c:a aac -b:a 128k';
        $this->runOutput($command, $this->extension() ?? 'mp4');
        return $this;
    }
    public function thumbnail(int $second = 1, string $format = 'jpg'): static
    {
        $destination = self::joinPath(TEMP_PATH, Generate::token() . '.' . ltrim($format, '.'));
        self::makeDirectory(TEMP_PATH);
        $command =
            'ffmpeg -y -ss ' . (int) $second . ' ' .
            '-i ' . escapeshellarg($this->path) . ' ' .
            '-frames:v 1';
        if (!self::runFfmpeg($command . ' ' . escapeshellarg($destination))) {
            Response::error('Unable to create thumbnail');
        }
        $this->thumbnailPath = $destination;
        return $this;
    }
    public function thumbnailPath(): ?string
    {
        return $this->thumbnailPath;
    }
    public function trim(int $start, int $duration): static
    {
        $command =
            'ffmpeg -y -ss ' . $start . ' ' .
            '-i ' . escapeshellarg($this->path) . ' ' .
            '-t ' . $duration . ' -c copy';
        $this->runOutput($command, $this->extension() ?? 'mp4');
        return $this;
    }
    public function mute(): static
    {
        $command =
            'ffmpeg -y -i ' . escapeshellarg($this->path) . ' -c:v copy -an';
        $this->runOutput($command, $this->extension() ?? 'mp4');
        return $this;
    }
    public function extractAudio(string $format = 'mp3'): static
    {
        $command =
            'ffmpeg -y -i ' . escapeshellarg($this->path) . ' -vn -c:a ' .
            ($format === 'mp3' ? 'mp3' : 'aac');
        $this->runOutput($command, $format);
        return $this;
    }
    public function toGif(int $fps = 10, int $width = 480): static
    {
        $command =
            'ffmpeg -y -i ' . escapeshellarg($this->path) . ' ' .
            '-vf "fps=' . $fps . ',scale=' . $width . ':-1:flags=lanczos"';
        $this->runOutput($command, 'gif');
        return $this;
    }
    public static function merge(array $paths, string $destination): bool
    {
        if (!self::ffmpegAvailable()) {
            return false;
        }
        $list = self::joinPath(TEMP_PATH, 'merge.txt');
        $content = '';
        foreach ($paths as $path) {
            $real = realpath($path);
            if ($real === false) {
                return false;
            }
            $content .= "file '" . str_replace('\\', '/', $real) . "'\n";
        }
        file_put_contents($list, $content);
        self::makeDirectory(dirname($destination));
        $command =
            'ffmpeg -y -f concat -safe 0 -i ' . escapeshellarg($list) . ' -c copy ' .
            escapeshellarg($destination);
        $result = self::runFfmpeg($command);
        self::remove($list);
        return $result;
    }
}
