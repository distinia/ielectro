<?php
namespace Nesh;
trait UsesFfmpeg
{
    protected static function ffmpegAvailable(): bool
    {
        exec('ffmpeg -version', $output, $code);
        return $code === 0;
    }
    protected static function ffprobeAvailable(): bool
    {
        exec('ffprobe -version', $output, $code);
        return $code === 0;
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
