````text
Refactor the server protection system.

The current approach uses a single root `.htaccess` file containing multiple RewriteRules to block protected directories. Remove this architecture completely.

Instead, every protected directory must contain its own `.htaccess` file.

Requirements:

- Keep the existing `Server::protect()` API.
- For every protected directory (default: `database`, `storage`, `data`, plus any directory added through `protect()`), automatically create or overwrite a `.htaccess` file inside that directory.
- The generated `.htaccess` must deny all HTTP access to both the directory itself and every file and subdirectory contained within it.
- The solution must be compatible with both Apache 2.4+ and Apache 2.2.

Use the following rules:

```apache
<IfModule mod_authz_core.c>
    Require all denied
</IfModule>

<IfModule !mod_authz_core.c>
    Order Allow,Deny
    Deny from all
</IfModule>
````

The root `.htaccess` should no longer contain any protection rules. It must only contain:

```apache
DirectoryIndex index.php

RewriteEngine On

RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]

RewriteRule ^ index.php [L,QSA]
```

Additional requirements:

* `Server::protect()` must remain chainable.
* Protected directories should be created automatically if they do not already exist.
* The `.htaccess` file inside each protected directory must always be regenerated (overwrite if it already exists).
* This logic must be completely independent from the database bootstrap process. Protecting directories should not depend on whether the application has already been initialized.

Refactor the implementation to keep the code as simple, modular, and maintainable as possible.

```
```
