<?php
namespace Nesh;
trait UsesFfmpeg
{
    protected static function ffmpegAvailable(): bool
    {
        static $available = null;
        if ($available !== null) {
            return $available;
        }
        exec('ffmpeg -version', $output, $code);
        $available = $code === 0;
        return $available;
    }
    protected static function ffprobeAvailable(): bool
    {
        static $available = null;
        if ($available !== null) {
            return $available;
        }
        exec('ffprobe -version', $output, $code);
        $available = $code === 0;
        return $available;
    }
    protected static function ffprobeValue(string $path, string $command): ?string
    {
        if (!self::ffprobeAvailable()) {
            return null;
        }
        $output = shell_exec(
            'ffprobe -v error ' .
            $command . ' ' .
            escapeshellarg($path)
        );
        $value = trim((string) $output);
        return $value !== '' ? $value : null;
    }
    protected static function runFfmpeg(string $command): bool
    {
        if (!self::ffmpegAvailable()) {
            return false;
        }
        exec($command, $output, $code);
        return $code === 0;
    }
}
