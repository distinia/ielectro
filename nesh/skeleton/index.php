<?php
require_once __DIR__ . '/../nesh/src/autoload.php';
$iElectroApp = $GLOBALS['iElectroApp'] ?? null;
if (!$iElectroApp instanceof \Nesh\App) {
    $iElectroApp = new \Nesh\App(
        'Application',
        'app',
        'app',
        'ielectro_app',
        '1.0.0'
    );
    $GLOBALS['iElectroApp'] = $iElectroApp;
}
$iElectroApp->run();
