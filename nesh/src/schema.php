<?php
namespace Nesh;

final class Schema
{
    public const ACCOUNT = 'ielectro_account';
    public const ADMIN = 'ielectro_admin';
    public const DYSCOVER = 'ielectro_dyscover';
    public const DOMINIONS = 'ielectro_dominions';

    public const DOMINIONS_USERS = self::DOMINIONS . '.users';

    public const ACCOUNTS = self::ACCOUNT . '.accounts';
    public const ACCOUNT_SESSIONS = self::ACCOUNT . '.account_sessions';
    public const ACCOUNT_ACTIVITY = self::ACCOUNT . '.account_activity';
    public const ACCOUNT_EMAIL_VERIFICATIONS = self::ACCOUNT . '.account_email_verifications';
    public const ACCOUNT_PASSWORD_RESETS = self::ACCOUNT . '.account_password_resets';
    public const ACCOUNT_OAUTH_PENDING = self::ACCOUNT . '.account_oauth_pending';

    public const ADMIN_CAREERS = self::ADMIN . '.careers';
    public const ADMIN_CAREER_APPLICATIONS = self::ADMIN . '.career_applications';
    public const ADMIN_NEWS = self::ADMIN . '.news';
    public const ADMIN_TEAM = self::ADMIN . '.team';
    public const ADMIN_RATE_LIMITS = self::ADMIN . '.rate_limits';
    public const ADMIN_WWW_PAGE_VIEWS = self::ADMIN . '.www_page_views';

    public const DYSCOVER_USERS = self::DYSCOVER . '.dyscover_users';
    public const DYSCOVER_TAGS = self::DYSCOVER . '.dyscover_tags';
    public const DYSCOVER_FOLLOWS = self::DYSCOVER . '.dyscover_follows';
    public const DYSCOVER_POSTS = self::DYSCOVER . '.dyscover_posts';
    public const DYSCOVER_POST_LIKES = self::DYSCOVER . '.dyscover_post_likes';
    public const DYSCOVER_POST_COMMENTS = self::DYSCOVER . '.dyscover_post_comments';
    public const DYSCOVER_POST_SHARES = self::DYSCOVER . '.dyscover_post_shares';
    public const DYSCOVER_POST_BOOKMARKS = self::DYSCOVER . '.dyscover_post_bookmarks';
    public const DYSCOVER_POST_VIEWS = self::DYSCOVER . '.dyscover_post_views';
    public const DYSCOVER_POST_MENTIONS = self::DYSCOVER . '.dyscover_post_mentions';
    public const DYSCOVER_POST_TAGS = self::DYSCOVER . '.dyscover_post_tags';
    public const DYSCOVER_POST_REPOSTS = self::DYSCOVER . '.dyscover_post_reposts';
    public const DYSCOVER_POST_STATISTICS = self::DYSCOVER . '.dyscover_post_statistics';
    public const DYSCOVER_TEMPLATE_FIELDS = self::DYSCOVER . '.dyscover_template_fields';
    public const DYSCOVER_GROUPS = self::DYSCOVER . '.dyscover_groups';
    public const DYSCOVER_GROUP_MEMBERS = self::DYSCOVER . '.dyscover_group_members';
    public const DYSCOVER_INBOX_CHATS = self::DYSCOVER . '.dyscover_inbox_chats';
    public const DYSCOVER_INBOX_MEMBERS = self::DYSCOVER . '.dyscover_inbox_members';
    public const DYSCOVER_INBOX_MESSAGES = self::DYSCOVER . '.dyscover_inbox_messages';
    public const DYSCOVER_INBOX_MESSAGE_READS = self::DYSCOVER . '.dyscover_inbox_message_reads';
    public const DYSCOVER_INBOX_MESSAGE_HIDES = self::DYSCOVER . '.dyscover_inbox_message_hides';
    public const DYSCOVER_ACTIVITY = self::DYSCOVER . '.dyscover_activity';
    public const DYSCOVER_REPORTS = self::DYSCOVER . '.dyscover_reports';
    public const DYSCOVER_BANNED_TERMS = self::DYSCOVER . '.dyscover_banned_terms';
}
