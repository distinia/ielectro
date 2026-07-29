<?php
namespace Nesh;
class Client
{
    public static function get(string $url, array $headers = []): string|false
    {
        return self::request('GET', $url, null, $headers);
    }
    public static function post(string $url, array|string|null $data = null, array $headers = []): string|false
    {
        return self::request('POST', $url, $data, $headers);
    }
    public static function put(string $url, array|string|null $data = null, array $headers = []): string|false
    {
        return self::request('PUT', $url, $data, $headers);
    }
    public static function patch(string $url, array|string|null $data = null, array $headers = []): string|false
    {
        return self::request('PATCH', $url, $data, $headers);
    }
    public static function delete(string $url, array|string|null $data = null, array $headers = []): string|false
    {
        return self::request('DELETE', $url, $data, $headers);
    }
    public static function download(string $url, string $path, array $headers = []): bool
    {
        $content = self::get($url, $headers);
        return $content !== false && File::write($path, $content);
    }
    public static function verify(string $url): bool
    {
        return filter_var(trim($url), FILTER_VALIDATE_URL) !== false;
    }
    private static function request(string $method, string $url, array|string|null $data = null, array $headers = []): string|false
    {
        if (!self::verify($url)) {
            return false;
        }
        $curl = curl_init(trim($url));
        if ($curl === false) {
            return false;
        }
        if (is_array($data)) {
            $data = json_encode($data);
        }
        $headers = array_merge(
            [
                'Accept: application/json',
                'Content-Type: application/json'
            ],
            $headers
        );
        curl_setopt_array($curl, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => $data
        ]);
        $response = curl_exec($curl);
        curl_close($curl);
        return $response;
    }
}