<!DOCTYPE html>
<html lang="en">
<head>
    <title>Password recovery</title>
    <meta name="keywords" content="forgot password, password reset, account recovery">
    <meta name="description" content="Recover access to your iElectro account by resetting your password">
</head>
<body class="session-page">
<div class="create-shell">
    <div class="create-brand"> 
        <img class="create-logo" src="https://account.ielectro.com/assets/brand/logo.png" alt="iElectro">
    </div>
    <div class="create-card auth-card">
        <form id="recovery-form" class="recovery-form" method="post">
            <h1 class="create-tagline">Reset your password</h1>
            <p class="auth-lead">Enter your email or username. We will send instructions to the address on file.</p>
            <label for="recovery-email-username" class="visually-hidden">Email or username</label>
            <input id="recovery-email-username" name="email-username" class="input-field" placeholder="Email or username" autofocus> 
            <button type="submit" class="auth-submit-btn">Send recovery email</button>
        </form>
        <div class="auth-links auth-links-single"> 
            <a href="https://account.ielectro.com/login?service=account">Back to sign in</a> 
        </div>
    </div>
</div>
</body>
</html>
