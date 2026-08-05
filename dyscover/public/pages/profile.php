<?php
use Dyscover\Avatar;
use Nesh\Query;
use Nesh\Response;
use Nesh\Routing;
$username = Routing::segment(1);
if (!$username) {
    Response::notFound();
}
$account = Query::fetch(
    'SELECT id, username FROM accounts WHERE username = ? LIMIT 1',
    [$username]
);
if (!$account) {
    Response::notFound();
}
$profile = Query::fetch(
    'SELECT * FROM dyscover_users WHERE account_id = ? LIMIT 1',
    [(int) $account['id']]
);
if (!$profile) {
    Response::notFound();
}
$userId = (int) $profile['id'];
$user = [
    'id' => $userId,
    'username' => htmlspecialchars($account['username'], ENT_QUOTES | ENT_SUBSTITUTE, CHARSET),
    'biography' => htmlspecialchars((string) ($profile['biography'] ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, CHARSET),
];
$analytics = [
    'posts' => Query::count(
        "SELECT COUNT(*) FROM dyscover_posts WHERE user_id = ? AND status = 'active'",
        [$userId]
    ),
    'followers' => Query::count(
        'SELECT COUNT(*) FROM dyscover_follows WHERE followed_id = ?',
        [$userId]
    ),
    'followings' => Query::count(
        'SELECT COUNT(*) FROM dyscover_follows WHERE follower_id = ?',
        [$userId]
    ),
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title><?= '@' . $user['username']; ?></title>
    <meta name="keywords" content="dyscover profile, user profile, social profile">
    <meta name="description" content="View and manage your Dyscover profile">
</head>
<body>
<div class="profile-page">
    <section class="profile-header">
        <div class="profile-avatar-wrap">
            <img class="avatar" alt="<?= $user['username']; ?>" src="<?= Avatar::get($userId); ?>">
        </div>
        <div class="profile-main">
            <div class="profile-top">
                <h1 class="username"><?= $user['username']; ?></h1>
                <div class="actions"></div>
            </div>
            <div class="user-stats">
                <span class="articles-number"><?= $analytics['posts']; ?> posts</span>
                <span class="followers-number"><?= $analytics['followers']; ?> followers</span>
                <span class="followings-number"><?= $analytics['followings']; ?> following</span>
            </div>
            <p class="biography"><?= $user['biography']; ?></p>
        </div>
    </section>
    <section class="profile-content">
        <div class="profile-tabs">
            <div class="profile-tab active" data-filter="posts" title="Posts"><i data-icon="grid"></i></div>
            <div class="profile-tab" data-filter="saved" title="Saved"><i data-icon="bookmark"></i></div>
            <div class="profile-tab" data-filter="liked" title="Liked"><i data-icon="heart"></i></div>
        </div>
        <div class="profile-type-tabs">
            <button type="button" class="profile-type-tab active" data-type="article">Articles</button>
            <button type="button" class="profile-type-tab" data-type="image">Images</button>
            <button type="button" class="profile-type-tab" data-type="video">Videos</button>
            <button type="button" class="profile-type-tab" data-type="audio">Audios</button>
            <button type="button" class="profile-type-tab" data-type="document">Documents</button>
            <button type="button" class="profile-type-tab" data-type="template">Templates</button>
        </div>
        <div class="profile-posts post-preview-grid"></div>
    </section>
</div>
</body>
</html>
