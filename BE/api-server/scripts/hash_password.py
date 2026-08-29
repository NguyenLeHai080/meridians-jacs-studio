#!/usr/bin/env python3
"""Generate a password hash for JACS_ADMIN_PASSWORD_HASH."""

from getpass import getpass

from app.core.security import hash_password


if __name__ == "__main__":
    first = getpass("Password: ")
    second = getpass("Repeat password: ")
    if not first or first != second:
        raise SystemExit("Passwords are empty or do not match")
    print(hash_password(first))
