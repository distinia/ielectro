<?php
require dirname(__DIR__, 2) . '/nesh/src/autoload.php';
use Dyscover\ExploreSearch;

$rows = ExploreSearch::posts('video', 'dest');
echo json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
