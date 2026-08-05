<?php
use Nesh\Entity;
use Nesh\Response;
use Nesh\Routing;
$uuid = Routing::segment(1);
if (!$uuid) {
    Response::notFound();
}
$article = new Entity('dyscover_posts', 'uuid', $uuid);
if ($article['type'] !== 'article') {
    Response::notFound();
}
$articlePath = APP_ASSETS
    . '/users/' . $article['user_id']
    . '/articles/' . $article['uuid'] . '.html';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title><?= $article['title']; ?></title>
    <meta name="keywords" content="dyscover article, read, blog post">
    <meta name="description" content="Read articles and posts on Dyscover">
</head>
<body>
    <aside class="article-main-content">
        <h1 class="title"><?= $article['title']; ?></h1>
        <section class="content">
            <?= $article->file($articlePath); ?>
        </section>
    </aside>
    <aside class="article-index-sidebar">
        <div class="index-sidebar-header">
            <div class="index-edit-button">
                <i data-icon="pencil"></i>
            </div>
            <h4>Index</h4>
        </div>
        <div class="index-sidebar-content">
            <section class="list"></section>
        </div>
    </aside>
</body>
</html>
