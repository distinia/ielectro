<?php

require_once __DIR__ . '/bootstrap.php';

use Nesh\Page;

$app->routing->pages->add(new Page(
    'activity',
    'Activity',
    'account activity, login history, security events, user activity',
    'View your recent account activity, sign-in history and security events'
));

$app->routing->pages->add(new Page(
    'create',
    'Create account',
    'register, sign up, create account, ielectro account',
    'Create your iElectro account to access all services'
));

$app->routing->pages->add(new Page(
    'home',
    'Account',
    'ielectro account, dashboard, profile, account home',
    'Manage your iElectro account and personal information'
));

$app->routing->pages->add(new Page(
    'login',
    'Sign in',
    'login, sign in, account access, ielectro login',
    'Sign in to your iElectro account securely'
));

$app->routing->pages->add(new Page(
    'oauth-create',
    'Complete registration',
    'google sign up, oauth, social login, account creation',
    'Complete your iElectro account after signing in with Google or another provider'
));

$app->routing->pages->add(new Page(
    'password-recovery',
    'Password recovery',
    'forgot password, password reset, account recovery',
    'Recover access to your iElectro account by resetting your password'
));

$app->routing->pages->add(new Page(
    'profile',
    'Profile',
    'profile, personal information, account settings',
    'Manage your personal information and profile details'
));

$app->routing->pages->add(new Page(
    'security',
    'Security',
    'account security, password, two factor authentication, sessions',
    'Manage your password, active sessions and account security settings'
));

$app->routing->run();