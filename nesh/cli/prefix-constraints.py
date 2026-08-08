#!/usr/bin/env python3
"""Prefix SQL foreign key constraint names with the service name."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

NO_PREFIX_TABLES = {
    "accounts",
    "rate_limits",
    "careers",
    "career_applications",
    "news",
    "team",
}

TABLE_PREFIXES = ("dyscover_", "account_", "dominions_", "admin_")


def bare_table_name(table: str) -> str:
    for prefix in TABLE_PREFIXES:
        if table.startswith(prefix):
            return table[len(prefix):]
    return table


def prefixed_name(name: str, service: str) -> str:
    marker = f"{service}_"
    if name.startswith(marker):
        return name
    return marker + name


def process_file(path: Path, service: str) -> bool:
    original = path.read_text(encoding="utf-8")
    lines = original.splitlines()
    current_table = ""
    skip_prefix = False
    updated_lines: list[str] = []
    changed = False

    create_pattern = re.compile(
        r"CREATE TABLE IF NOT EXISTS `[^`]+`\.`([^`]+)`",
        re.IGNORECASE,
    )
    constraint_pattern = re.compile(r"CONSTRAINT `([^`]+)`", re.IGNORECASE)

    for line in lines:
        create_match = create_pattern.search(line)
        if create_match:
            current_table = create_match.group(1)
            skip_prefix = bare_table_name(current_table) in NO_PREFIX_TABLES

        if not skip_prefix:
            def replace(match: re.Match[str]) -> str:
                nonlocal changed
                old = match.group(1)
                new = prefixed_name(old, service)
                if new != old:
                    changed = True
                return f"CONSTRAINT `{new}`"

            line = constraint_pattern.sub(replace, line)

        updated_lines.append(line)

    if not changed:
        return False

    path.write_text("\n".join(updated_lines) + ("\n" if original.endswith("\n") else ""), encoding="utf-8")
    return True


def main() -> None:
    count = 0
    for service in ("account", "admin", "dyscover", "dominions"):
        database_dir = ROOT / service / "database"
        if not database_dir.is_dir():
            continue
        for sql in sorted(database_dir.glob("*.sql")):
            if process_file(sql, service):
                print(f"Updated {sql.relative_to(ROOT)}")
                count += 1
    print(f"Done. Files updated: {count}")


if __name__ == "__main__":
    main()
