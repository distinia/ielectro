<?php
# Service
# Deployment: subdomain
# Base URL: https://ielectro.com
define('DOMAIN', 'ielectro.com');
# CORS
define('CORS_ALLOWED_DOMAINS', [DOMAIN , 'google.com']);
# Application
define('TIMEZONE', 'Europe/Rome');
define('LOCALE', 'en_US');
define('CHARSET', 'UTF-8');
# Database
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
# Session
define('SESSION_NAME', 'ielectro_session');
define('SESSION_LIFETIME', 60 * 60 * 24 * 180); // 180 days (~6 months)
# Cookies
define('COOKIE_DOMAIN', '.ielectro.com');
define('COOKIE_PATH', '/');
define('COOKIE_SECURE', true);
define('COOKIE_HTTPONLY', true);
define('COOKIE_SAMESITE', 'Lax');
# Security
define('JWT_EXPIRES', 60 * 60 * 24 * 180); // 180 days (~6 months)
define('CSRF_TOKEN_LENGTH', 64);
# Mail
define('MAIL_PORT', 587);
define('MAIL_ENCRYPTION', 'tls');
define('MAIL_NAME', 'iElectro');
define('MAIL_ADDRESS', 'noreply@' . DOMAIN);
# Upload
define('UPLOAD_MAX_SIZE', 262144000);
define('UPLOAD_IMAGE_MAX_SIZE', 10485760);
define('UPLOAD_DOCUMENT_MAX_SIZE', 52428800);
define('UPLOAD_ALLOWED', 'jpg,jpeg,png,gif,webp,avif,svg,pdf');
@ini_set('upload_max_filesize', '256M');
@ini_set('post_max_size', '256M');
@ini_set('max_execution_time', '300');
# Cache
define('CACHE_LIFETIME', 3600);
# API
define('API_VERSION', 'v1');
define('API_RATE_LIMIT', 60);
define('API_ALLOW_CORS', false);
# Real-time WebSocket
define('REALTIME_URL', '');
define('REALTIME_TOKEN', '');
# CDN
define('CDN_ENABLED', false);
define('ASSET_VERSION', '');
# Paths & Initialization
define('ROOT_PATH', dirname(__DIR__, 2));
define('NESH_VERSION', '1.0.0');
define('NESH_PATH', ROOT_PATH.'/nesh');
define('NESH_CLI', NESH_PATH.'/cli');
define('NESH_FRAMEWORK', NESH_PATH.'/src');
define('NESH_AI', NESH_PATH.'/ai');
spl_autoload_register(function (string $class): void {
    $parts = explode('\\', $class);
    $namespace = array_shift($parts);
    if ($namespace === 'Nesh') {
        $fileName = strtolower(
            preg_replace('/(?<!^)[A-Z]/', '-$0', array_pop($parts))
        ) . '.php';
        $file = $parts === []
            ? NESH_FRAMEWORK . '/' . $fileName
            : NESH_PATH . '/' . strtolower(implode('/', $parts)) . '/' . $fileName;
        if (is_file($file)) {
            require_once $file;
        }
        return;
    }
    $directory = ROOT_PATH . '/'
        . strtolower($namespace)
        . '/api';
    if (!is_dir($directory)) {
        return;
    }
    if ($parts !== []) {
        $fileName = strtolower(
            preg_replace('/(?<!^)[A-Z]/', '-$0', $parts[0])
        ) . '.php';
        $file = $directory . '/' . $fileName;
        if (is_file($file)) {
            require_once $file;
            return;
        }
    }
    foreach (glob($directory . '/*.php') as $file) {
        require_once $file;
    }
});
\Nesh\Request::start();
use Nesh\App;
$GLOBALS['account'] = new App('iElectro Account', 'https://account.ielectro.com', 'account', 'ielectro_account', '1.0.0');
$GLOBALS['admin'] = new App('iElectro Admin', 'https://admin.ielectro.com', 'admin', 'ielectro_admin', '1.0.0');
$GLOBALS['dyscover'] = new App('iElectro Dyscover', 'https://dyscover.ielectro.com', 'dyscover', 'ielectro_dyscover', '1.0.0');
$GLOBALS['ielectro'] = new App('iElectro', 'https://www.ielectro.com', 'www', null, '1.0.3');