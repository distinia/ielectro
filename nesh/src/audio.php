<?php
namespace Nesh;
class Audio extends File
{
    use UsesFfmpeg;
    protected ?float $duration = null;
    protected ?int $bitrate = null;
    protected ?int $sampleRate = null;
    protected ?int $channels = null;
    public static function open(string $path): static
    {
        $audio = parent::open($path);
        if (!$audio->verify()) {
            Response::badRequest('Invalid audio');
        }
        return $audio;
    }
    public static function upload(
        array $file,
        ?string $name = null,
        bool $overwrite = false
    ): static {
        $audio = parent::upload($file, $name, $overwrite);
        if (!$audio->verify()) {
            $audio->delete();
            Response::badRequest('Invalid audio');
        }
        return $audio;
    }
    public static function uploadTo(
        array $file,
        string $directory,
        ?string $name = null,
        bool $overwrite = false
    ): static {
        $audio = parent::uploadTo($file, $directory, $name, $overwrite);
        if (!$audio->verify()) {
            $audio->delete();
            Response::badRequest('Invalid audio');
        }
        return $audio;
    }
    protected function refreshMetadata(): void
    {
        parent::refreshMetadata();
        if (!$this->verify()) {
            $this->duration = null;
            $this->bitrate = null;
            $this->sampleRate = null;
            $this->channels = null;
            return;
        }
        $this->duration = $this->probeDuration();
        $this->bitrate = $this->probeBitrate();
        $this->sampleRate = $this->probeSampleRate();
        $this->channels = $this->probeChannels();
    }
    public function verify(): bool
    {
        return $this->exists() && self::isAudio($this->path);
    }
    public function duration(): ?float
    {
        return $this->duration;
    }
    public function bitrate(): ?int
    {
        return $this->bitrate;
    }
    public function sampleRate(): ?int
    {
        return $this->sampleRate;
    }
    public function channels(): ?int
    {
        return $this->channels;
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
    protected function probeSampleRate(): ?int
    {
        $value = self::ffprobeValue(
            $this->path,
            '-select_streams a:0 -show_entries stream=sample_rate -of default=noprint_wrappers=1:nokey=1'
        );
        return $value !== null ? (int) $value : null;
    }
    protected function probeChannels(): ?int
    {
        $value = self::ffprobeValue(
            $this->path,
            '-select_streams a:0 -show_entries stream=channels -of default=noprint_wrappers=1:nokey=1'
        );
        return $value !== null ? (int) $value : null;
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
        $destination = self::joinPath(File::tempDir(), Generate::token() . '.' . ltrim($extension, '.'));
        self::makeDirectory(File::tempDir());
        if (!self::runFfmpeg($command . ' ' . escapeshellarg($destination))) {
            Response::error('Audio processing failed');
        }
        $this->replaceWith($destination);
    }
    public function convert(string $format = 'mp3', int $bitrate = 192): static
    {
        $command =
            'ffmpeg -y -i ' . escapeshellarg($this->path) . ' ' .
            '-c:a ' . ($format === 'mp3' ? 'libmp3lame' : 'aac') . ' ' .
            '-b:a ' . (int) $bitrate . 'k';
        $this->runOutput($command, $format);
        return $this;
    }
    public function compress(int $bitrate = 128): static
    {
        return $this->convert($this->extension() ?? 'mp3', $bitrate);
    }
    public function tryCompress(int $bitrate = 128): bool
    {
        if (!self::ffmpegAvailable()) {
            return false;
        }
        $format = $this->extension() ?? 'mp3';
        $command =
            'ffmpeg -y -i ' . escapeshellarg($this->path) . ' ' .
            '-c:a ' . ($format === 'mp3' ? 'libmp3lame' : 'aac') . ' ' .
            '-b:a ' . (int) $bitrate . 'k';
        $destination = self::joinPath(
            File::tempDir(),
            Generate::token() . '.' . ltrim($format, '.')
        );
        self::makeDirectory(File::tempDir());
        if (!self::runFfmpeg($command . ' ' . escapeshellarg($destination))) {
            return false;
        }
        $this->replaceWith($destination);
        return true;
    }
    public function trim(int $start, int $duration): static
    {
        $command =
            'ffmpeg -y -ss ' . $start . ' ' .
            '-i ' . escapeshellarg($this->path) . ' ' .
            '-t ' . $duration . ' -c copy';
        $this->runOutput($command, $this->extension() ?? 'mp3');
        return $this;
    }
}
