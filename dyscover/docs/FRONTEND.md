````md
# Dyscover Frontend Update Requirements
## General Rules
- Keep the code simple, modular, and consistent with the existing architecture.
- Do not create unnecessary classes.
- Global functions must be moved as static methods inside `App`.
- `App` must become the main container for global utilities.
- Never use `App.api()` or similar methods to generate API URLs.
- API URLs must be defined directly inside `Request` calls.
- Keep the existing class-based system:
  - `App`
  - `Request`
  - `Card`
  - Existing components
- Avoid duplicated logic between different pages.
---
# WebSocket Realtime System
Dyscover must use a combination of:
- REST API for standard operations
- WebSocket for realtime functionality
WebSocket must not replace REST APIs.
Architecture:
```text
Frontend JS
       |
       |
 -----------------
 |               |
REST API     WebSocket
 |               |
Database    Realtime Server
````
---
# REST API
REST APIs remain responsible for:
* Content loading
* Post creation
* Post editing
* Search
* Profiles
* Groups
* Analytics
* Data management
Examples:
```http
GET /api/posts/feed
POST /api/posts/create
GET /api/profile/user
```
---
# WebSocket
WebSocket must only be used where immediate updates are required.
Do not create unnecessary WebSocket connections.
---
## Inbox Realtime
Chat must use WebSocket for:
* New messages
* Received messages
* Message seen status
* Message reactions
* Conversation updates
Message flow:
```text
Client
 |
REST API
 |
Database
 |
WebSocket Broadcast
 |
Recipient
```
---
## Activity Realtime
Activity Overlay must receive realtime notifications through WebSocket.
Events:
```text
new_notification
new_follow
new_like
new_comment
new_mention
new_share
```
Flow:
```text
Server
 |
WebSocket
 |
Activity Overlay
```
---
# Card System
Cards must never use WebSocket directly.
Cards must work through REST API:
```text
Card
 |
REST API
 |
Render Content
```
Reason:
* A page can contain many Cards.
* Avoid hundreds of simultaneous connections.
* Keep the system lightweight.
---
# App.js
## Utility Refactoring
All isolated functions outside classes must be moved inside `App` as static methods.
`App` must contain:
* DOM utilities
* URL utilities
* Generic utilities
* Common helpers
---
## API Handling
Remove completely:
```js
App.api()
```
It must no longer exist.
API URLs must be called directly.
Before:
```js
Request.get(App.api("article/feed"))
```
After:
```js
Request.get("https://dyscover.ielectro.com/api/article/feed")
```
---
# Card.js
## Share Tracking
Every post share must be registered.
Supported shares:
* Copy link
* Share through inbox
* Any other sharing method
Database:
```text
dyscover_post_shares
```
Store:
* `post_id`
* `user_id`
* Share type
* Date
---
## Mention System
Mentions in:
* Comments
* Bio
* Post descriptions
are valid only if the user exists.
Example:
```text
@username
```
A mention is created only when:
```text
username exists in database
```
Otherwise it remains normal text.
---
## Views System
Implement:
```text
dyscover_post_views
```
When a post is displayed through:
```js
buildBoxHtml()
```
the view counter must increase.
Rules:
* Avoid immediate duplicate views.
* Use session/user tracking.
* Save timestamps.
* Support future analytics.
---
# Home.js
Home and Explore/Search must remain separate.
Home represents automatic content discovery.
---
# Home Tabs
Home must contain:
* My Feed
* Following
* Trending
---
## My Feed
Personalized feed based on user interests.
Interests source:
```text
https://account.ielectro.com/u/{username}/dyscover/interests.json
```
The PHP API must manage and update this file.
Ranking algorithm:
* Personal interests
* Similar content
* Content quality
* Popularity
* Engagement
* Freshness
Do not display only random content.
---
## Following
Show recent content from followed users.
Ordering:
* New articles
* New media
* New templates
---
## Trending
Future section:
* Popular content
* Emerging creators
* Growing articles
---
# Explore / Search
Explore must remain separate from Home.
Purpose:
Intentional search.
URL:
```text
/search?term=
```
Example:
```text
/search?term=Roman%20Empire
```
Search supports:
* Articles
* Users
* Groups
* Templates
* Media
Difference:
Home:
```text
"What can I discover?"
```
Explore/Search:
```text
"What am I looking for?"
```
---
# Profile.js
## Missing User
When opening:
```text
https://dyscover.ielectro.com/u/null
```
Do not show an alert.
Behavior:
* Clear `<main>` completely.
* Display centered message:
```text
Unfortunately this user does not exist
```
using Dyscover styling.
---
## Mentioned Tab
Add a new tab after:
```text
Liked
```
New tab:
```text
Mentioned
```
Display all posts where the user was mentioned.
Database:
```text
dyscover_post_mentions
```
Fields:
* `id`
* `post_id`
* `mentioned_user_id`
* `creator_user_id`
* `created_at`
Only mentions inside post descriptions are stored.
---
# Activity.js
Activity must no longer be a page.
It becomes a global overlay available across the platform.
Usage:
```js
Activity.open()
```
Available from:
* Home
* Explore
* Manager
* Profile
* Inbox
---
## Notifications Overlay
Contains:
* New followers
* Likes
* Comments
* Mentions
* Shares
* Other activities
---
## Notification Read State
Unread notifications must have:
* Different background
* Visual indicator
* Unread state
---
## Remove Mark All Read
Remove:
```text
Mark all read
```
When Activity opens:
* All notifications are automatically marked as read.
---
# Manager.js
Manager becomes the main Creator Center.
It must not be only an editor.
Structure:
```text
Manager
├── Posts
├── Analytics
└── Groups
```
---
# Manager Posts
Main content management section.
Contains:
```text
Create
Published
Drafts
Archived
```
---
## Create
The create button must exist here.
Remove the create button from navbar.
Flow:
```text
Manager
 |
Posts
 |
Create
```
Supported content:
* Article
* Image
* Video
* Audio
* Document
* Template
* Scenario
* Universe
---
## Edit Post
Opening a post opens configuration panel.
Must support:
* Edit title
* Edit description
* Edit content
* Edit categories
* Manage media
* Manage visibility
Display:
* Views
* Likes
* Comments
* Shares
---
# Manager Analytics
Creator analytics.
Display:
* Total views
* Follower growth
* Engagement
* Best content
* Performance over time
---
# Manager Groups
Manage user-created groups.
Functions:
* Create group
* Edit group
* Add users
* Remove users
* Manage group image
---
# Inbox.js
## Reply Messages
Implement message replies.
Database field:
```text
reply_message_id
```
Example:
```text
↳ Hello
How are you?
```
---
## Emoji Reactions
Add message reactions.
Supported emojis:
* ❤️
* 👍
* 😂
* 😮
* 😢
* 😡
* 🔥
* 👏
* 🎉
* 🤔
Create database system connected to messages.
---
## Attachment System
When sending an attachment:
* Send automatically.
* Text is optional.
* `body` can be NULL.
Add:
* Download button near attachment.
Attachments must not use:
```css
.chat-msg-mine
```
---
## Media Preview Overlay
When clicking an attachment:
Do not open external links.
Open:
```text
Overlay Viewer
```
Features:
* Large preview
* Close action
* Download
---
## Remove Typing Indicator
Remove completely:
```text
User is typing...
```
Do not use typing APIs.
---
## NotificationPopup
Inside conversations:
```text
userX chat
```
Do not show:
```text
NotificationPopup
```
---
## Seen Status
Add:
```text
View 3 min ago
```
Implement:
```text
message_seen_at
```
---
## Emoji Input
Allow emoji insertion directly inside the message input.
---
## Message Timestamps
Use Instagram-like behavior.
Rules:
* Nearby messages should not always display timestamps.
* After 30 minutes display:
```text
14:02
```
or:
```text
7 Jun 2026, 14:02
```
---
# Post Sharing in Chat
Shared posts must not be stored inside:
```text
body
```
of:
```text
dyscover_chat_messages
```
Use:
```text
post
```
containing:
```text
post_id
```
Frontend flow:
1. Receive `post_id`.
2. Call API.
3. Rebuild Card.
The field:
```text
body
```
can be NULL.
---
# Attachment File Storage
Every file must have a random unique name.
Example:
```text
https://dyscover.ielectro.com/content/chat/xJr3JKASxnej24JDAKJ.png
```
Do not use:
```text
image1.png
video.mp4
```
Required for supporting millions of files.
---
# Group Chat
Implement private groups.
Database:
```text
dyscover_groups
```
Functions:
* Create group
* Add users
* Remove users
* Group image
* Group name
Structure:
```text
Group
id
name
image
creator
created_at
```
Relations:
```text
dyscover_group_members
```
---
# Chat UI Design
Completely redesign chat styling.
Do not automatically reuse:
```text
button
```
from:
```text
app.css
```
Create dedicated chat components.
Goals:
* Dyscover style
* Modern UI
* Consistent design
* Function-specific buttons
* Better alignment
---
# Collaborative Editing
Support:
* Collaborators
* Edit suggestions
* Change approval workflow
---
# Feed Ranking
Ranking must consider:
* Interests
* Following
* Quality
* Popularity
* Engagement
* Freshness
---
# Creator Statistics
Analytics must include:
* Views
* Likes
* Shares
* Follower growth
* Best performing content
```
```