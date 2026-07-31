<?php
require_once __DIR__ . '/bootstrap.php';
use Nesh\Page;
$app->routing->pages->add(new Page(

));
$app->routing->run();