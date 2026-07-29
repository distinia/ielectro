<?php
namespace Nesh;
class Geolocation
{
    private ?string $city = null;
    private ?string $country = null;
    public function __construct(string $ip)
    {
        require_once NESH_PATH . '/vendor/autoload.php';
        if (in_array($ip, ['127.0.0.1', '::1', 'localhost'], true)) {
            $this->city = 'Milan';
            $this->country = 'IT';
            return;
        }
        try {
            $reader = new \GeoIp2\Database\Reader(NESH_PATH . '/data/geoip-countries.mmdb');
            $record = $reader->city($ip);
            $this->city = $record->city->name ?: null;
            $this->country = $record->country->isoCode ?: null;
        } catch (\Exception) {
        }
    }
    public function city(): ?string
    {
        return $this->city;
    }
    public function country(): ?string
    {
        return $this->country;
    }
}