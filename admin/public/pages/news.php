<!DOCTYPE html>
<html lang="en">
<head>
    <title>News management</title>
    <meta name="keywords" content="admin news, content editor, ielectro admin">
    <meta name="description" content="Create and manage news articles in the iElectro admin panel">
</head>
<body>
<div class="admin-layout">
    <div class="admin-sidebar-mount"></div>
    <div class="admin-main">
        <div class="admin-shell">
            <div class="admin-toolbar toolbar-list">
                <button type="button" class="primary admin-action-new">New article</button>
            </div>
            <div class="admin-toolbar panel-hidden toolbar-form">
                <button type="button" class="secondary admin-action-back-list">Back to list</button>
            </div>
            <div class="admin-toolbar panel-hidden toolbar-view">
                <button type="button" class="secondary admin-action-back-list">Back to list</button>
                <button type="button" class="primary link-edit-from-view">Edit</button>
            </div>
            <section class="admin-card panel-list">
                <h1>News</h1>
                <div class="admin-list-filters">
                    <input type="search" class="admin-filter-search news-filter-q" placeholder="Search…" autocomplete="off" aria-label="Search news">
                    <select class="admin-filter-sort news-filter-sort" aria-label="Sort news">
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="az">Title A–Z</option>
                        <option value="za">Title Z–A</option>
                    </select>
                </div>
                <div class="news-list"></div>
            </section>
            <section class="admin-card panel-hidden panel-form">
                <h1 class="form-heading">News</h1>
                <form class="news-form">
                    <select name="status">
                        <option value="1">Active</option>
                        <option value="0">Hidden</option>
                    </select>
                    <input type="hidden" name="id" value="">
                    <input type="text" name="title" placeholder="Title" required>
                    <textarea name="body" rows="8" placeholder="Body" required></textarea>
                    <input type="text" name="image" placeholder="Cover image filename or external URL (https://...)" autocomplete="off">
                    <input type="file" class="news-image" accept="image/*" autocomplete="off">
                    <button type="submit" class="btn-primary">Save</button>
                </form>
                <p class="hint form-msg"></p>
                <button type="button" class="btn-danger panel-hidden news-delete">
                    Delete this article
                </button>
            </section>
            <section class="admin-card panel-hidden panel-view">
                <div class="news-view"></div>
            </section>
        </div>
    </div>
</div>
</body>
</html>
