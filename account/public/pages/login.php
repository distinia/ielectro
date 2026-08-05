<!DOCTYPE html>
<html lang="en">
<head>
    <title>Sign in</title>
    <meta name="keywords" content="login, sign in, account access, ielectro login">
    <meta name="description" content="Sign in to your iElectro account securely">
</head>
<body class="session-page">
<div class="create-shell">
    <div class="create-brand">
        <img class="create-logo" src="https://account.ielectro.com/assets/brand/logo.png" alt="iElectro">
    </div>
    <div class="create-card auth-card">
        <form id="login-form" class="login-form" method="post">
            <h1 class="create-tagline">Sign in to your iElectro account</h1>
            <label for="login-username" class="visually-hidden">Email or username</label>
            <input id="login-username" name="identifier" class="input-field" placeholder="Email or username" autofocus>
            <label for="login-password" class="visually-hidden">Password</label>
            <input id="login-password" name="password" class="input-field" type="password" placeholder="Password">
            <button type="submit" class="auth-submit-btn">Sign in</button>
        </form>
        <div class="auth-divider">
            <span>or continue with</span>
        </div>
        <div id="g_id_onload" data-client_id="330597496243-srvq8tqchj7bpgo4d1kqf1tt5j1rj6mo.apps.googleusercontent.com"
            data-context="signin" data-ux_mode="popup" data-callback="getGoogleData"
            data-scope="profile email https://www.googleapis.com/u.phonenumbers.read https://www.googleapis.com/u.addresses.read"
            data-auto_prompt="false"></div>
        <div class="auth-google-wrap">
            <div class="g_id_signin" data-type="standard" data-shape="rectangular" data-theme="outline"
                data-text="signin_with" data-size="large" data-locale="en-US" data-logo_alignment="left"></div>
        </div>
        <div class="auth-links">
            <a href="https://account.ielectro.com/password-recovery">Forgot password?</a>
            <a href="https://account.ielectro.com/create">Create account</a>
        </div>
    </div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jose/5.2.4/index.umd.min.js"
    integrity="sha512-m/b/2v0WXyLJmYRbj8yqiq1QFrrV7hmM1H3sg9u9g3HK0E42Xu+fRatPhHPtK7+ZVErlk0YjPFRXWOai72T1Aw=="
    crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<script src="https://accounts.google.com/gsi/client" async defer></script>
</body>
</html>
