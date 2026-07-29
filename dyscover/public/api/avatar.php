<?php
namespace Dyscover;
class Avatar
{
    public static function url(mixed $arg1) {
        return APP_URL.'/u/'.rawurlencode((string) $username).'/avatar.png';
    }
}
