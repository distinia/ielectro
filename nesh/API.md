# Nesh REST API Guidelines
This document defines the conventions for building REST APIs with the Nesh framework used across iElectro applications.
---
# URL Structure
Every application exposes its API under:
```
/api
```
Examples:
```
POST /api/auth/login
GET  /api/profile
POST /api/user/email
```
---
# File Structure
```
public/
└── api/
    ├── auth.php
    ├── user.php
    ├── profile.php
    └── ...
```
One file = one service.
The filename determines the class name.
Example:
```
public/api/auth.php
```
contains
```php
namespace Account;
class Auth
{
}
```
---
# Routing
```
/api/auth
```
↓
```php
Auth::index()
```
```
/api/auth/login
```
↓
```php
Auth::login()
```
```
/api/auth/logout
```
↓
```php
Auth::logout()
```
Hyphenated URLs become camelCase methods.
Example
```
/api/email-verification/send
```
↓
```php
EmailVerification::send()
```
---
# HTTP Methods
Use the appropriate HTTP verb.
| Method | Purpose |
|---------|----------|
| GET | Read resources |
| POST | Create resources or execute actions |
| PUT | Replace a resource |
| PATCH | Partial update |
| DELETE | Delete a resource |
Examples
```
GET    /api/profile
POST   /api/auth/login
POST   /api/recovery
PATCH  /api/user/email
DELETE /api/session
```
---
# Request Body
Always use JSON.
Example
```json
{
    "email": "john@example.com",
    "password": "secret"
}
```
Read it with
```php
$input = Request::body();
```
---
# Responses
Always return JSON.
Success
```json
{
    "success": true,
    "data": ...
}
```
Error
```json
{
    "success": false,
    "message": "Invalid password"
}
```
Use the Response class.
Examples
```php
Response::success();
Response::success($data);
Response::badRequest();
Response::unauthorized();
Response::forbidden();
Response::notFound();
Response::methodNotAllowed();
Response::error();
```
---
# Authentication
Authentication is cookie-based.
```
session_token
```
The session is validated automatically by Routing.
Public APIs are defined in
```php
Routing::PUBLIC_API
```
Every other API requires
```
Identity::required()
```
automatically.
---
# Identity
Authenticated user information is available through
```php
Identity::id();
Identity::sessionId();
Identity::username();
```
---
# CSRF
All state-changing requests should be protected using CSRF.
The frontend sends
```
X-CSRF-Token
```
The backend validates it through
```php
Security::validate();
```
---
# Validation
Never trust client input.
Use
```php
Validate
```
Example
```php
Validate::required();
Validate::email();
Validate::username();
Validate::password();
```
---
# Rate Limiting
Sensitive endpoints should always use RateLimit.
Example
```php
RateLimit::check(
    'login',
    30,
    900
);
```
---
# Passwords
Never compare passwords manually.
Use
```php
Password::hash();
Password::verify();
```
---
# Identifiers
Generate secure values using
```php
Generate::token();
Generate::hash();
Generate::uuid();
```
Never use
```
uniqid()
rand()
mt_rand()
```
for security-sensitive values.
---
# Database
Use the Query class.
Examples
```php
Query::fetch();
Query::fetchAll();
Query::exists();
Query::execute();
```
Never concatenate SQL strings.
Always use prepared statements.
Example
```php
Query::fetch(
    "SELECT *
     FROM accounts
     WHERE id = ?",
    [$id]
);
```
---
# API Design
Each class should represent one resource or one domain.
Good
```
Auth
User
Profile
Recovery
OAuth
Session
Device
```
Avoid classes mixing unrelated logic.
Bad
```
AccountManager
Utilities
Everything
```
---
# Naming
URLs use kebab-case.
```
email-verification
password-recovery
```
Classes use PascalCase.
```
EmailVerification
PasswordRecovery
```
Methods use camelCase.
```
sendCode()
verify()
changePassword()
```
---
# Business Logic
API classes should contain business logic only.
Do not place
- routing
- authentication
- CSRF
- CORS
inside API classes.
Those responsibilities belong to Nesh.
---
# Status Codes
| Code | Meaning |
|------:|---------|
| 200 | Success |
| 201 | Resource created |
| 204 | No content |
| 400 | Bad request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 405 | Method not allowed |
| 409 | Conflict |
| 422 | Validation error |
| 429 | Too many requests |
| 500 | Internal server error |
---
# General Principles
- One service per file.
- One responsibility per class.
- One endpoint, one action.
- Use HTTP methods correctly.
- Always validate input.
- Always use prepared statements.
- Never trust client data.
- Never expose internal errors.
- Keep APIs predictable and RESTful.