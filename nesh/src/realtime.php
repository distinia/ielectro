<?php
namespace Nesh;
class Realtime
{
    public static function emit(string $event, array $data = []): bool
    {
        return self::send([
            'event' => trim($event),
            'data' => $data
        ]);
    }
    public static function user(int|string $user, string $event, array $data = []): bool
    {
        return self::send([
            'user' => $user,
            'event' => trim($event),
            'data' => $data
        ]);
    }
    public static function room(string $room, string $event, array $data = []): bool
    {
        return self::send([
            'room' => trim($room),
            'event' => trim($event),
            'data' => $data
        ]);
    }
    public static function broadcast(string $event, array $data = []): bool
    {
        return self::send([
            'broadcast' => true,
            'event' => trim($event),
            'data' => $data
        ]);
    }
    public static function online(int|string $user): bool
    {
        return self::send([
            'user' => $user,
            'event' => 'online'
        ]);
    }
    public static function offline(int|string $user): bool
    {
        return self::send([
            'user' => $user,
            'event' => 'offline'
        ]);
    }
    public static function disconnect(int|string $user): bool
    {
        return self::send([
            'user' => $user,
            'event' => 'disconnect'
        ]);
    }
    private static function send(array $payload): bool
    {
        if (!defined('REALTIME_URL') || REALTIME_URL === '') {
            return false;
        }
        return Client::post(
            REALTIME_URL,
            $payload,
            [
                'Authorization: Bearer '.REALTIME_TOKEN
            ]
        ) !== false;
    }
}