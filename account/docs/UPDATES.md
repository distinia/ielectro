# Account Application Changes
## Overview
The `/account` application is the central identity and authentication service of iElectro.
It manages:
- User authentication
- Account creation
- Profile management
- Password recovery
- Sessions
- Identity-related APIs
````
The main improvements required focus on security, consistency, and maintainability.
---
# High Priority Changes
## 1. Verify Google Authentication Tokens
### Current Issue
Google authentication currently decodes the JWT token without verifying its authenticity.
The application must not trust decoded token data.
### Required Change
Implement server-side Google/OpenID token verification.
The verification process must validate:
* JWT signature
* Audience (`aud`)
* Issuer (`iss`)
* Expiration (`exp`)
* Email verification status (`email_verified`)
The application should use:
* Official Google authentication libraries
* Or a secure JWT/OpenID verification library such as `jose`
### Goal
Only accept authentication tokens issued by Google and intended for the iElectro application.
---
## 2. Require Current Password for Sensitive Changes
### Current Issue
The frontend requests `current-password`, but sensitive backend operations do not verify it.
Affected operations:
* Password change
* Email change
* Username change
* Account deletion
### Required Change
Sensitive operations must require additional verification.
Accepted methods:
* Current password verification
* OTP verification
* Other strong authentication methods
### Goal
Prevent account takeover through an active session.
---
## 3. Apply CSRF Protection to All Sensitive Actions
### Current Issue
CSRF protection exists in some areas:
* Recovery flows
* Session operations
However, several authenticated update endpoints do not validate CSRF tokens.
Affected areas:
* `api/core/update.php`
* `api/core/delete.php`
### Required Change
All authenticated state-changing requests must validate:
```
X-CSRF-Token
```
Required for:
* POST requests
* PUT requests
* DELETE requests
### Goal
Protect authenticated users from unauthorized state changes.
---
## 4. Fix Activity Log Action Schema
### Current Issue
The application logs actions that are not included in the database schema.
Examples:
```
login_failed
account_deletion_scheduled
```
The current enum definition does not support these values.
### Required Change
Expand the database enum.
### Recommended Solution
Use `VARCHAR` because activity logs can evolve over time.
### Goal
Avoid database failures when adding new logged events.
---
## 5. Fix Username Update API Path
### Current Issue
The frontend references:
```
api/update/uname
```
The real endpoint is:
```
api/update/username.php
```
### Required Change
Update frontend requests to:
```
https://account.ielectro.com/api/update/username
```
### Goal
Keep frontend routes aligned with backend structure.
---
# Medium Priority Changes
## 6. Remove Nested Database Transactions
### Current Issue
`Create::createAll()` starts a transaction and calls:
```
Account::create()
```
which starts another transaction.
Nested transactions can cause unexpected behavior.
### Required Change
Only the highest-level operation should control transactions.
Example:
```
Create::createAll()
    |
    └── Account::create()
```
Only `Create::createAll()` manages the transaction.
### Goal
Maintain predictable database consistency.
---
## 7. Improve Session Revocation During Login
### Current Issue
Every login executes:
```
revokeAllSessions()
```
This invalidates all active sessions on every device.
### Current Behavior
Example:
```
Device A: logged in
Device B: new login
Result:
Device A session revoked
```
### Required Change
Only revoke all sessions when:
* Password is changed
* User requests logout from all devices
* Security settings require it
### Goal
Allow normal multi-device authentication.
---
## 8. Remove Hardcoded Configuration
### Current Issue
Some configuration values are hardcoded:
Examples:
* Database credentials
* Domains
* Cookie domains
* Google client IDs
* API URLs
### Required Change
Move configuration values into environment files.
Example:
```
account/.env
```
Possible values:
```env
DB_HOST=
DB_NAME=
DB_USER=
DB_PASSWORD=
APP_URL=
COOKIE_DOMAIN=
GOOGLE_CLIENT_ID=
```
### Goal
Separate application configuration from application logic.
---
## 9. Improve Password Recovery Security
### Current Issue
Password recovery currently:
* Stores OTP values in plain text
* Sends technical tokens through email
* Can reveal whether an account exists
### Required Change
Implement:
* Hashed OTP storage
* Generic recovery responses
* Limited token exposure
* Expiration handling
* Attempt limits
Example:
Bad:
```
Email exists: true
```
Good:
```
If the account exists, recovery instructions have been sent.
```
### Goal
Prevent user enumeration and protect recovery tokens.
---
# Low Priority Improvements
## 10. Remove Unused or Inconsistent Classes
### Current Issue
Some classes appear unused or inconsistent with the current authentication flow.
Example:
```
GoogleSignup::complete()
```
The current Google flow uses:
```
pending cookie
Create::google()
```
### Required Change
Review and remove:
* Dead code
* Unused classes
* Legacy authentication flows
### Goal
Keep the authentication system simple and maintainable.
---
## 11. Improve Frontend Autocomplete
### Current Issue
Autocomplete is disabled on many fields.
This reduces compatibility with:
* Password managers
* Browser autofill
* Accessibility tools
### Required Change
Use standard autocomplete values:
Login:
```html
autocomplete="username"
```
Password:
```html
autocomplete="current-password"
```
New password:
```html
autocomplete="new-password"
```
Email:
```html
autocomplete="email"
```
### Goal
Improve user experience and password manager support.
---
# Remove
The following patterns should be removed:
* Overly restrictive activity log enums
* Nested database transactions
* Hardcoded URLs and paths
* Manual Google JWT decoding
* Duplicated configuration values
---
# Keep
The following architecture decisions are good and should remain:
## Application Separation
Keep separated:
```
auth/
update/
profile/
system/
```
Each area has a specific responsibility.
---
## Session Security
Keep:
* Session tokens stored as hashes
* HttpOnly cookies
* Server-side session validation
---
## Username History
Keep:
```
account_username_history
```
This provides:
* Redirect compatibility
* Username change tracking
* Historical references
---
# Implementation Order
Recommended execution order:
1. Google token verification
2. Sensitive action verification
3. CSRF protection
4. Activity log schema correction
5. Username endpoint fix
6. Environment configuration migration
7. Password recovery improvements
8. Transaction cleanup
9. Session behavior improvement
10. Frontend cleanup
