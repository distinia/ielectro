# Nesh Framework
---
# About
Nesh is the internal PHP framework developed for the **iElectro ecosystem**.
Unlike Laravel, Symfony or other enterprise frameworks, Nesh has a single goal:
> **Provide a lightweight, clean and modern foundation without unnecessary abstractions.**
Every component has been written from scratch using native PHP.
The framework avoids:
- Composer dependencies
- Dependency Injection containers
- Service Providers
- Middleware pipelines
- Facades
- PSR complexity
- Reflection magic
Instead it focuses on:
- readability
- performance
- modularity
- developer productivity
Every class has one responsibility.
Every method is intentionally small.
Every feature is optional.
---
# Philosophy
The framework follows a few simple principles.
## Simplicity
The easiest solution is almost always the best one.
```php
$user = Query::fetch(
    "SELECT * FROM accounts WHERE id=?",
    [$id]
);
```
instead of dozens of chained objects.
---
## Native PHP
Everything is built using PHP itself.
If PHP already provides a solution, Nesh uses it.
Examples:
- GD
- cURL
- mysqli
- password_hash()
- OpenSSL
- mail()
- JSON
- file system
---
## Zero dependencies
The framework does not require:
- Laravel
- Symfony
- Doctrine
- Composer packages
The only optional third-party dependency is GeoIP2 for IP geolocation.
---
## Object Oriented
Every resource is represented by an object.
Examples:
```
Image
Video
Audio
Pdf
```
while utilities remain static.
```
Query
Cache
Request
Response
Strings
Date
Validate
```
---
# Project Structure
```
nesh/
├── framework/
│   ├── bootstrap.php
│   ├── app.php
│   ├── connection.php
│   ├── query.php
│   ├── request.php
│   ├── response.php
│   ├── page.php
│   ├── session.php
│   ├── security.php
│   ├── cache.php
│   ├── identifier.php
│   ├── file.php
│   ├── image.php
│   ├── video.php
│   ├── audio.php
│   ├── pdf.php
│   ├── realtime.php
│   ├── ...
│   └── utils/
│
└── cli/
```
---
# Applications
Every application shares the same framework.
```
account/
admin/
www/
dyscover/
```
Each application contains its own:
```
api/
assets/
components/
data/
pages/
scripts/
styles/
```
while all business logic remains inside **Nesh**.
---
# Boot Process
Every application starts with:
```php
<?php
require_once __DIR__.'/../../../nesh/src/autoload.php';
$app = new App('account');
```
The boot process is:
```
bootstrap
↓
load constants
↓
autoload classes
↓
App
↓
Request
↓
Database
↓
Schema
↓
Session
↓
Page
↓
Application
```
---
# Autoloading
Nesh automatically scans every PHP file.
```php
new Classes(NESH_FRAMEWORK);
```
There is no Composer autoloader.
---
# Configuration
Every configuration is stored as PHP constants.
Examples:
```php
DB_HOST
DB_NAME
DB_USER
DB_PASS
TIMEZONE
CHARSET
DOMAIN
CACHE_PREFIX
SESSION_NAME
MAIL_ADDRESS
```
Applications may redefine any constant before loading the framework.
---
# Core Components
## App
Responsible for booting an application.
It defines application constants like
```
APP_PATH
APP_URL
APP_API
APP_ASSETS
APP_COMPONENTS
APP_DATA
APP_PAGES
```
and initializes the framework.
---
## Request
Provides everything related to the incoming HTTP request.
Features
- GET
- POST
- JSON body
- uploaded files
- route
- IP
- User Agent
- CORS
- method validation
Example
```php
$email = Request::value("email");
$file = Request::file("avatar");
$route = Routing::path();
```
---
## Response
Simple HTTP responses.
```php
Response::success();
Response::created();
Response::badRequest();
Response::unauthorized();
Response::forbidden();
Response::notFound();
Response::error();
```
Arrays automatically become JSON.
---
## Query
Database abstraction built on mysqli.
Supports
- execute
- fetch
- fetchAll
- value
- exists
- count
- lastInsertId
- transactions
Example
```php
$user = Query::fetch(
    "SELECT * FROM accounts WHERE id=?",
    [$id]
);
```
---
## Connection
Singleton mysqli connection.
Automatically initialized.
---
## Schema
Automatically executes every SQL file inside
```
database/
```
Useful for automatic migrations.
---
## Session
Handles authenticated users.
Features
- session lookup
- activity update
- account retrieval
- cached session
---
## Security
Provides
- CSRF
- AES-256-GCM encryption
- random token generation
- secure comparisons
---
## Cookie
Wrapper around PHP cookies.
Automatically uses
```
COOKIE_DOMAIN
COOKIE_SAMESITE
COOKIE_SECURE
```
---
## Password
Utilities for
- hashing
- verification
- password strength
- password generation
---
## RateLimit
Database-driven rate limiter.
Can limit requests by
- IP
- identifier
- custom scope
---
## Cache
Filesystem cache.
Supports
- remember
- increment
- decrement
- flush
- expiration
---
## Identifier
Utilities for
- UUID-like tokens
- SHA256 hashes
- unique slugs
---
## File System
The File class represents every file.
Supports
- upload
- move
- rename
- copy
- delete
- hash
- mime
- scan directories
---
# Images
Image extends File.
Supports
- resize
- crop
- rotate
- flip
- thumbnail
- cover
- fit
- convert
- compress
Implemented using GD.
---
# Videos
Video extends File.
Uses FFmpeg.
Supports
- resize
- compress
- trim
- mute
- gif
- thumbnail
- merge
- extract audio
---
# Audio
Supports
- convert
- compress
- trim
Uses FFmpeg.
---
# PDF
Represents PDF documents.
Supports
- validation
- metadata
- page count
---
# API Client
Simple cURL wrapper.
Supports
```
GET
POST
PUT
PATCH
DELETE
```
---
# REST Dispatcher
Automatically maps URLs into methods.
```
/user/profile
↓
profile()
```
No routing configuration required.
---
# URL Utilities
Provides
```
current()
host()
protocol()
segments()
redirect()
refresh()
build()
```
---
# Mail
Simple wrapper around PHP mail().
Supports
- HTML
- plain text
---
# Date
Date helpers.
Examples
```php
Date::now();
Date::today();
Date::age();
Date::difference();
Date::isWeekend();
```
---
# Arrays
Collection helpers.
Supports
- dot notation
- merge
- flatten
- filter
- map
- random
---
# Strings
String helpers.
Supports
- trim
- contains
- startsWith
- endsWith
- slug
- snake
- camel
- studly
- limit
---
# Validate
Validation helpers.
Supports
- email
- username
- integer
- uuid
- date
- URL
- JSON
- IP
---
# Logging
Daily log files.
Supports
```
debug
info
warning
error
```
---
# Realtime
Simple HTTP client for realtime server communication.
---
# Geolocation
Uses GeoIP2 to resolve
- city
- country
from an IP address.
---
# Design Principles
The framework intentionally avoids:
❌ ORM
❌ Active Record
❌ Dependency Injection
❌ Middleware
❌ Reflection
❌ Facades
❌ Magic methods
❌ Annotations
Instead it prefers
✅ Small classes
✅ Native PHP
✅ Explicit code
✅ Static helpers
✅ Fast execution
✅ Easy debugging
---
# Coding Style
- One class per file
- One responsibility per class
- No namespaces
- Native PHP only
- PSR formatting where practical
- Clear naming
- No hidden behavior
---
# Performance
Nesh minimizes runtime overhead.
- No runtime container
- No package discovery
- No reflection
- No service providers
- Minimal memory footprint
---
# Goals
The framework is designed to power the entire iElectro ecosystem.
Current applications include:
- Account
- Admin
- WWW
- Dyscover
Future applications can reuse the same framework without modification.
---
# License
Copyright © iElectro.
Nesh is proprietary software developed exclusively for the iElectro ecosystem.