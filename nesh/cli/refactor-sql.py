#!/usr/bin/env python3
"""One-time refactor: qualify SQL tables and remove database->use() calls."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

DB_ACCOUNT = "ielectro_account"
DB_ADMIN = "ielectro_admin"
DB_DYSCOVER = "ielectro_dyscover"
DB_DOMINIONS = "ielectro_dominions"

ACCOUNT_MAP = {
    "sessions": "account_sessions",
    "activity": "account_activity",
    "email_verifications": "account_email_verifications",
    "password_resets": "account_password_resets",
    "oauth_pending": "account_oauth_pending",
}

DYSCOVER_MAP = {
    "users": "dyscover_users",
    "tags": "dyscover_tags",
    "follows": "dyscover_follows",
    "posts": "dyscover_posts",
    "post_likes": "dyscover_post_likes",
    "post_comments": "dyscover_post_comments",
    "post_shares": "dyscover_post_shares",
    "post_bookmarks": "dyscover_post_bookmarks",
    "post_views": "dyscover_post_views",
    "post_mentions": "dyscover_post_mentions",
    "post_tags": "dyscover_post_tags",
    "post_reposts": "dyscover_post_reposts",
    "post_statistics": "dyscover_post_statistics",
    "template_fields": "dyscover_template_fields",
    "groups": "dyscover_groups",
    "group_members": "dyscover_group_members",
    "inbox_chats": "dyscover_inbox_chats",
    "inbox_members": "dyscover_inbox_members",
    "inbox_messages": "dyscover_inbox_messages",
    "inbox_message_reads": "dyscover_inbox_message_reads",
    "inbox_message_reactions": "dyscover_inbox_message_reactions",
    "inbox_typing": "dyscover_inbox_typing",
    "activity": "dyscover_activity",
}

NO_PREFIX = {
    "accounts",
    "rate_limits",
    "careers",
    "career_applications",
    "news",
    "team",
}


def qualify(table: str, db: str, mapping: dict[str, str]) -> str:
    if table in NO_PREFIX:
        return f"{db}.{table}"
    if table in mapping:
        return f"{db}.{mapping[table]}"
    return f"{db}.{table}"


def replace_table_token(text: str, old: str, qualified: str) -> str:
    patterns = [
        (rf"`{re.escape(old)}`", f"`{qualified.replace('.', '`.`')}`"),
        (rf"\bFROM {re.escape(old)}\b", f"FROM {qualified}"),
        (rf"\bJOIN {re.escape(old)}\b", f"JOIN {qualified}"),
        (rf"\bINTO {re.escape(old)}\b", f"INTO {qualified}"),
        (rf"\bUPDATE {re.escape(old)}\b", f"UPDATE {qualified}"),
        (rf"\bTABLE {re.escape(old)}\b", f"TABLE {qualified}"),
        (rf"\bREFERENCES `{re.escape(old)}`", f"REFERENCES `{qualified.replace('.', '`.`')}`"),
        (rf"\bFROM `{re.escape(old)}`", f"FROM `{qualified.replace('.', '`.`')}`"),
        (rf"\bJOIN `{re.escape(old)}`", f"JOIN `{qualified.replace('.', '`.`')}`"),
        (rf"\bINTO `{re.escape(old)}`", f"INTO `{qualified.replace('.', '`.`')}`"),
        (rf"\bUPDATE `{re.escape(old)}`", f"UPDATE `{qualified.replace('.', '`.`')}`"),
        (rf"\bDELETE FROM {re.escape(old)}\b", f"DELETE FROM {qualified}"),
        (rf"\bDELETE FROM `{re.escape(old)}`", f"DELETE FROM `{qualified.replace('.', '`.`')}`"),
        (rf"CREATE TABLE IF NOT EXISTS `{re.escape(old)}`", f"CREATE TABLE IF NOT EXISTS `{qualified.replace('.', '`.`')}`"),
    ]
    for pattern, repl in patterns:
        text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
    return text


def transform_sql_file(path: Path, db: str, mapping: dict[str, str]) -> None:
    original = path.read_text(encoding="utf-8")
    updated = original
    for old in sorted(mapping.keys(), key=len, reverse=True):
        updated = replace_table_token(updated, old, qualify(old, db, mapping))
    for table in NO_PREFIX:
        updated = replace_table_token(updated, table, qualify(table, db, {}))
    if updated != original:
        path.write_text(updated, encoding="utf-8")


def transform_dyscover_php(text: str) -> str:
    lines = []
    for line in text.splitlines():
        if re.search(r"->database->use\s*\(\s*\)\s*;", line):
            continue
        if re.search(r"\$GLOBALS\['[^']+'\]->database->use\s*\(\s*\)\s*;", line):
            continue
        lines.append(line)
    text = "\n".join(lines)
    if text.endswith("\n") or not text:
        pass
    elif "\n" in text:
        text += "\n"

    for old in sorted(DYSCOVER_MAP.keys(), key=len, reverse=True):
        q = qualify(old, DB_DYSCOVER, DYSCOVER_MAP)
        text = replace_table_token(text, old, q)
    text = replace_table_token(text, "accounts", f"{DB_ACCOUNT}.accounts")
    for old in sorted(ACCOUNT_MAP.keys(), key=len, reverse=True):
        text = replace_table_token(text, old, qualify(old, DB_ACCOUNT, ACCOUNT_MAP))
    for table in NO_PREFIX:
        if table == "accounts":
            continue
        text = replace_table_token(text, table, f"{DB_ADMIN}.{table}")
    return text


def transform_dominions_sql_file(path: Path) -> None:
    original = path.read_text(encoding="utf-8")
    updated = original
    tables = set(
        re.findall(
            r"CREATE TABLE IF NOT EXISTS `(?:[^`.]+\.)?([^`]+)`",
            updated,
            flags=re.IGNORECASE,
        )
    )
    for table in sorted(tables, key=len, reverse=True):
        if table.startswith("ielectro_"):
            continue
        updated = replace_table_token(updated, table, f"{DB_DOMINIONS}.{table}")
    if updated != original:
        path.write_text(updated, encoding="utf-8")


def transform_account_php(text: str) -> str:
    lines = []
    for line in text.splitlines():
        if re.search(r"->database->use\s*\(\s*\)\s*;", line):
            continue
        if re.search(r"\$GLOBALS\['[^']+'\]->database->use\s*\(\s*\)\s*;", line):
            continue
        lines.append(line)
    text = "\n".join(lines)
    if text and not text.endswith("\n"):
        text += "\n"
    for old in sorted(ACCOUNT_MAP.keys(), key=len, reverse=True):
        text = replace_table_token(text, old, qualify(old, DB_ACCOUNT, ACCOUNT_MAP))
    text = replace_table_token(text, "accounts", f"{DB_ACCOUNT}.accounts")
    for old in sorted(DYSCOVER_MAP.keys(), key=len, reverse=True):
        text = replace_table_token(text, old, qualify(old, DB_DYSCOVER, DYSCOVER_MAP))
    return text


def transform_admin_php(text: str) -> str:
    lines = []
    for line in text.splitlines():
        if re.search(r"->database->use\s*\(\s*\)\s*;", line):
            continue
        if re.search(r"\$GLOBALS\['[^']+'\]->database->use\s*\(\s*\)\s*;", line):
            continue
        lines.append(line)
    text = "\n".join(lines)
    if text and not text.endswith("\n"):
        text += "\n"
    for table in NO_PREFIX:
        text = replace_table_token(text, table, f"{DB_ADMIN}.{table}")
    return text


def main() -> None:
    for sql in (ROOT / "account" / "database").glob("*.sql"):
        transform_sql_file(sql, DB_ACCOUNT, ACCOUNT_MAP)
    for sql in (ROOT / "dyscover" / "database").glob("*.sql"):
        transform_sql_file(sql, DB_DYSCOVER, DYSCOVER_MAP)
    for sql in (ROOT / "admin" / "database").glob("*.sql"):
        transform_sql_file(sql, DB_ADMIN, {})
    for sql in (ROOT / "dominions" / "database").glob("*.sql"):
        transform_dominions_sql_file(sql)

    for pattern in ["dyscover/api/*.php"]:
        for path in ROOT.glob(pattern):
            path.write_text(transform_dyscover_php(path.read_text(encoding="utf-8")), encoding="utf-8")

    for pattern in ["account/api/*.php"]:
        for path in ROOT.glob(pattern):
            path.write_text(transform_account_php(path.read_text(encoding="utf-8")), encoding="utf-8")

    for pattern in ["admin/api/*.php"]:
        for path in ROOT.glob(pattern):
            path.write_text(transform_admin_php(path.read_text(encoding="utf-8")), encoding="utf-8")

    rate_limit = ROOT / "nesh" / "src" / "rate-limit.php"
    rate_limit.write_text(transform_admin_php(rate_limit.read_text(encoding="utf-8")), encoding="utf-8")

    install = ROOT / "nesh" / "cli" / "install.php"
    install.write_text(
        install.read_text(encoding="utf-8")
        .replace("$database = new Database('ielectro_' . $folder);", "$databaseName = 'ielectro_' . $folder;")
        .replace("$database->create();", "Database::create($databaseName);")
        .replace("$database->use();", "")
        .replace("$database->tables($appPath . '/database');", "Database::tables($databaseName, $appPath . '/database');")
        .replace("$database->close();", "Database::close();"),
        encoding="utf-8",
    )

    print("Refactor script completed.")


if __name__ == "__main__":
    main()
