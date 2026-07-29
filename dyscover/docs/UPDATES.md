````md id="73941"
# Dyscover Backend Analysis and Changes
## Overview
The `/dyscover` application has a good architectural foundation:
- Main pages at root level
- Business logic inside `api/core`
- Thin endpoints inside `api/<domain>`
- Separate JavaScript files per page
- Assets organized inside `style`
- User generated content stored inside `u`
Compared to other applications, Dyscover requires more security attention because it manages:
- User generated content
- File uploads
- Chat
- Profiles
- Editable articles
- Social interactions
---
# High Priority Changes
## 1. Fix Post and Article Ownership Validation
### Current Issue
Article and post editing/deletion operations verify authentication but do not always verify ownership.
Affected files:
```text
api/core/article.php
api/core/post.php
````
Examples:
```php
Article::edit()
Post::update()
Post::delete()
```
Current behavior:
```text
User logged in
        |
        v
Can edit/delete content
```
Required behavior:
```text
User logged in
        |
        v
Verify ownership
        |
        v
Allow edit/delete
```
Required validation:
```php
content.user_id === Session::id()
```
Exceptions:
* Administrators
* Authorized moderators
---
# 2. Align Chat Database Schema and Core Logic
## Current Issue
Database schema and chat core use different models.
Database schema:
```text
conversations
conversation_members
messages
message_reads
```
Chat core:
```text
user_one_id
user_two_id
thread_id
read_at
```
The two implementations are incompatible.
---
## Required Change
Use the more flexible conversation model:
```text
conversations
    |
    |
conversation_members
    |
    |
messages
    |
    |
message_reads
```
Benefits:
* Supports private conversations
* Supports group chats
* Easier future expansion
---
# 3. Fix Empty Post API Endpoints
## Current Issue
The following endpoints are empty:
```text
api/post/create.php
api/post/delete.php
api/post/recents.php
api/post/search.php
api/post/update.php
api/post/user.php
```
The core already contains post logic, but endpoints do not call it.
This creates frontend bugs and inconsistent behavior.
---
## Required Change
For every endpoint:
Choose one:
* Implement endpoint logic
* Connect endpoint to existing core logic
* Remove endpoint if unused
Do not keep empty endpoints.
---
# 4. Validate Media and Chat Uploads
## Current Issue
Upload handling relies too much on:
* File extension
* Original filename
Affected:
```text
api/core/media.php
api/core/chat.php
```
---
## Required Change
Every upload must validate:
* Real MIME type
* Maximum file size
* Allowed extensions
* Storage permissions
Files must:
* Use random generated names
* Never trust user filenames
* Avoid unsafe formats
SVG files must be blocked unless sanitized.
Example:
Bad:
```text
image.png
```
Good:
```text
xJr3JKASxnej24JDAKJ.png
```
---
# 5. Remove or Protect test.php
## Current Issue
`test.php` is a migration script.
It:
* Scans HTML files inside `u`
* Rewrites files
* Deletes files using `unlink`
This should not be publicly accessible.
---
## Required Change
Remove from web root.
Alternative locations:
```text
scripts/
migrations/
cli/
```
or protect it for:
* CLI usage
* Local administration
---
# Medium Priority Changes
# 6. Improve Article HTML Sanitization
## Current Issue
`Article::cleanHTML()` removes:
* contenteditable attributes
* empty paragraphs
but does not fully protect against:
* Script tags
* Event handlers
* Javascript URLs
---
## Required Change
Implement strict HTML whitelist.
Allowed:
* Text formatting
* Links
* Images
* Safe HTML structure
Blocked:
```html
<script>
onclick=
javascript:
```
---
# 7. Secure AI Generation Endpoint
## Current Issue
The article generator directly calls:
```text
http://localhost:11434/api/generate
```
---
## Required Change
AI generation must be:
* Protected by authentication
* Rate limited
* Configurable
* Timeout controlled
Configuration must use environment variables.
If unused:
* Remove endpoint
* Remove frontend references
---
# 8. Review Chat Storage
## Current Issue
Chat storage uses:
```text
../../content/chat/
```
but the directory does not exist clearly in the application structure.
---
## Required Change
Use a defined storage location.
Examples:
```text
u/{userId}/chat/
```
or:
```text
content/chat/
```
Requirements:
* Explicit directory structure
* Random filenames
* Secure permissions
---
# 9. Unify API URL Handling
## Current Issue
`update.txt` requires removing:
```javascript
App.api()
```
but `app.js` still uses it.
---
## Required Change
Choose one approach.
Recommended:
* Centralized configuration
* Direct URLs inside Request calls
Remove duplicated URL generation logic.
---
# 10. Limit Public Queries
## Current Issue
Public searches and listings do not always have limits.
Affected:
* User search
* Post search
* Media search
---
## Required Change
Every public query must support:
```text
page
limit
```
Rules:
* Maximum 50 results
* Explicit ordering
* Pagination required
---
# Low Priority Changes
# 11. Move update.txt to Documentation
## Current Issue
`update.txt` contains useful development notes but should not be publicly accessible.
---
## Required Change
Move to:
```text
docs/dyscover-roadmap.md
```
or outside the web root.
---
# 12. Reduce Frontend Duplication
## Current Issue
`app.js` is too large.
It currently contains:
* Navbar
* Alert
* Card
* Overlay
* UsersList
* Notifications
* Other utilities
---
## Required Change
Without changing architecture, split into ES modules:
```text
ui.js
card.js
notifications.js
request.js
```
---
# 13. Fix Encoding Issues
## Current Issue
Some JS/text outputs contain broken characters:
Examples:
```text
Â·
â€¦
Ã
```
---
## Required Change
Ensure:
* UTF-8 encoding everywhere
* Files saved without incorrect conversions
* Consistent editor encoding
---
# 14. Improve Content Visibility Checks
## Current Issue
`Post::data()` uses:
```text
TableRelations::post()
```
which retrieves active posts but does not always apply visibility rules.
---
## Required Change
Create a single permission method:
```php
Post::canView($post, $viewerId)
```
All post visibility checks must use this method.
---
# Remove
The following should be removed:
* `dyscover/test.php`
* Empty post API endpoints if not implemented
* Public `update.txt`
* Original filenames for chat uploads
* Global article modifications using:
```php
glob('../../u/*/article/*.html')
```
unless strictly required
---
# Immediate Changes
Implement first:
1. Ownership validation:
   * `Article::edit`
   * `Post::update`
   * `Post::delete`
2. Chat schema/core alignment
3. Article HTML sanitization
4. Upload validation
5. Empty post endpoint cleanup
---
# Keep
The following architectural decisions are good:
## Domain Separation
Keep:
```text
api/core
```
with separated domains:
* Activity
* Chat
* Post
* Template
* User
---
## Thin Endpoints
Keep endpoint structure:
```text
api/<domain>/<action>
```
Endpoints should only route requests.
---
## User Content Storage
Keep:
```text
u/{userId}/{type}
```
Advantages:
* Simple
* Readable
* Scalable
---
The current direction is correct and should be expanded rather than replaced.