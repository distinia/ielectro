<!DOCTYPE html>
<html lang="en">
<head>
    <title>Activity</title>
    <meta name="keywords" content="account activity, login history, security events, user activity">
    <meta name="description" content="View your recent account activity, sign-in history and security events">
</head>
<body>
<main class="activity-page">
    <header class="account-hero account-hero--activity">
        <h1>Activity</h1>
    </header>
    <section class="activity-section">
        <div class="activity-card">
            <div class="activity-toolbar">
                <h2 class="activity-section-title">Activity log</h2>
                <label class="activity-filter-label" for="activity-type-filter">Show</label> 
                <select id="activity-type-filter" class="activity-type-filter" aria-label="Filter activity by type">
                    <option value="all">All activity</option>
                    <option value="signin">Sign-in &amp; sessions</option>
                    <option value="password">Password &amp; recovery</option>
                    <option value="account">Account &amp; profile</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div id="activity-output" class="activity-list"></div>
        </div>
    </section>
</main>
</body>
</html>
