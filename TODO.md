Certo. Io darei a Cursor un prompt così, abbastanza preciso da evitare che interpreti male la logica:

```text
Implement a centralized Nesh deployment system.

Do NOT modify the application's business logic.
Do NOT change class names, database logic, API behavior, routing behavior, or UI behavior unless required to update deployment URLs.

The goal is to make the entire iElectro project easily portable between different hosting environments.

# 1. Deployment command

Add/support this CLI command:

php nesh domain <URL>

Examples:

php nesh domain https://ielectro.com

php nesh domain https://ielectro.altervista.org

php nesh domain http://localhost/ielectro

The command must automatically determine the deployment type from the supplied URL.

---

# 2. Deployment modes

## Mode A — Subdomains

When the supplied URL represents the main iElectro domain:

https://ielectro.com

the applications must use subdomains.

The resulting URLs are:

https://account.ielectro.com
https://admin.ielectro.com
https://dyscover.ielectro.com
https://dominions.ielectro.com
https://nesh.ielectro.com
https://www.ielectro.com

---

## Mode B — Subfolders

When the supplied URL does not support/use the iElectro subdomain structure, use subfolders.

Example:

https://ielectro.altervista.org

The resulting URLs are:

https://ielectro.altervista.org/account
https://ielectro.altervista.org/admin
https://ielectro.altervista.org/dyscover
https://ielectro.altervista.org/dominions
https://ielectro.altervista.org/nesh
https://ielectro.altervista.org/www

---

## Mode C — Local development

Example:

http://localhost/ielectro

Use the same subfolder structure:

https://account.ielectro.com
https://admin.ielectro.com
https://dyscover.ielectro.com
https://dominions.ielectro.com
https://nesh.ielectro.com
https://www.ielectro.com

The implementation must also work with other local base URLs and must not hardcode `localhost`.

---

# 3. IMPORTANT: www is a normal application

`www` MUST NOT be treated as the root application.

It is a normal application and must always be exposed as:

Subdomain mode:

https://www.ielectro.com

Subfolder mode:

https://example.com/www

Local mode:

https://www.ielectro.com

Do NOT convert `/www` into `/`.

Do NOT create special handling that hides the `www` folder.

The application folder is always:

www

and its public URL must correspond to that deployment mode.

---

# 4. Applications

The deployment system must know these applications:

account
admin
dyscover
dominions
nesh
www

The folder name is the canonical identifier of the application.

For example:

account → account
admin → admin
dyscover → dyscover
dominions → dominions
nesh → nesh
www → www

Do not duplicate this information throughout the codebase.

---

# 5. autoload.php

The deployment command must update the centralized application configuration inside `autoload.php`.

The existing App initialization currently looks conceptually like:

new App(
    'iElectro Account',
    'https://account.ielectro.com',
    'account',
    'ielectro_account',
    '1.0.0'
);

Update the URL passed to every App according to the selected deployment.

The folder parameter must remain unchanged.

The deployment URL must be generated from the deployment configuration rather than manually hardcoded for each environment.

Do not move the App initialization to a separate runtime configuration system unless absolutely necessary.

`autoload.php` remains the centralized project configuration file.

---

# 6. Global URL migration

After changing the deployment, the CLI command must scan the project and update old iElectro URLs.

It must search relevant project files, including:

- PHP
- HTML
- CSS
- JavaScript
- JSON
- configuration files
- Markdown/documentation files only where appropriate

It must update known application URLs such as:

https://account.ielectro.com
https://admin.ielectro.com
https://dyscover.ielectro.com
https://dominions.ielectro.com
https://nesh.ielectro.com
https://www.ielectro.com

to their new deployment equivalents.

For example, when switching to:

http://localhost/ielectro

replace:

https://account.ielectro.com

with:

https://account.ielectro.com

and similarly for every other application.

When switching to:

https://ielectro.altervista.org

replace them with:

https://ielectro.altervista.org/account
https://ielectro.altervista.org/admin
etc.

When switching back to:

https://ielectro.com

restore:

https://account.ielectro.com
https://admin.ielectro.com
etc.

---

# 7. Do not perform a blind replacement

Do NOT simply replace arbitrary occurrences of `ielectro.com`.

The deployment system must understand each application's canonical URL.

For example:

account → account
admin → admin
dyscover → dyscover
dominions → dominions
nesh → nesh
www → www

Only replace URLs that correspond to known iElectro applications.

Do not modify unrelated URLs.

Do not modify database hosts, email addresses, third-party domains, or unrelated strings unless they are explicitly part of the deployment configuration.

---

# 8. Idempotency

Running the command multiple times with the same URL must be safe.

For example:

php nesh domain http://localhost/ielectro

followed again by:

php nesh domain http://localhost/ielectro

must NOT produce:

http://localhost/ielectro/ielectro/account

or any other duplicated path.

The command must always resolve URLs from the canonical application definitions.

---

# 9. App URL generation

The App class must remain scalable.

It should receive the final application URL, for example:

new App(
    'iElectro Account',
    'https://account.ielectro.com',
    'account',
    'ielectro_account',
    '1.0.0'
);

The `folder` remains the source of the application's identity.

Do not make App depend on a specific hosting provider.

It must work with:

- subdomains
- subfolders
- localhost
- arbitrary domains
- arbitrary base paths

---

# 10. Preserve existing architecture

Do NOT introduce unnecessary abstractions.

Do NOT create duplicated configuration systems.

Do NOT create a second independent deployment configuration that conflicts with `autoload.php`.

Do NOT modify business logic.

Do NOT modify API logic.

Do NOT modify database logic.

Do NOT modify routing unless a deployment URL change requires it.

Do NOT rename existing classes or methods.

Use the existing Nesh architecture wherever possible.

---

# 11. CLI behavior

The CLI should validate the supplied URL before modifying anything.

If the URL is invalid, show a clear error and do not modify the project.

Before changing files, determine:

- protocol
- host
- base path
- deployment mode
- application URLs

Then perform the migration.

The CLI should report what deployment was detected.

Example:

Deployment: subdomain
Base URL: https://ielectro.com

Applications:

account   https://account.ielectro.com
admin     https://admin.ielectro.com
dyscover  https://dyscover.ielectro.com
dominions https://dominions.ielectro.com
nesh      https://nesh.ielectro.com
www       https://www.ielectro.com

For:

php nesh domain http://localhost/ielectro

show:

Deployment: subfolder
Base URL: http://localhost/ielectro

Applications:

account   https://account.ielectro.com
admin     https://admin.ielectro.com
dyscover  https://dyscover.ielectro.com
dominions https://dominions.ielectro.com
nesh      https://nesh.ielectro.com
www       https://www.ielectro.com

---

# 12. Final requirement

The deployment system must allow the entire iElectro project to be moved between:

https://ielectro.com

https://ielectro.altervista.org

http://localhost/ielectro

or another equivalent domain/base path

by running only:

php nesh domain <URL>

The command must automatically:

1. detect the deployment mode
2. generate all application URLs
3. update `autoload.php`
4. update old application URLs throughout the project
5. preserve the `folder` names
6. keep `www` exposed as `/www` in subfolder deployments
7. avoid duplicate paths
8. avoid modifying unrelated URLs
9. leave the rest of the application architecture untouched

The result must be deterministic, scalable, reversible, and safe to run repeatedly.
```
