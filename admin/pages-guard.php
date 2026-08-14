<?php
namespace Admin;
use Nesh\Pages;
require_once __DIR__ . '/api/access.php';
class AdminPages extends Pages
{
    public function render(): void
    {
        Access::requirePage();
        parent::render();
    }
}
