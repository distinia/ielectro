# iElectro Architecture Overview
## Overview
iElectro is composed of multiple independent applications and subdomains.
Each application is a standalone module that follows the same internal architecture and shares common services and resources through the `/nesh` directory.
Example:
```text
ielectro/
│
├── www/
├── account/
├── admin/
├── dyscover/
└── nesh/
````
---
# Application Structure
Each application follows this structure:
```text
application/
│
├── api/
├── assets/
├── components/
├── data/
├── pages/
├── utils/
└── .htaccess
```
Each folder has a specific responsibility and should not contain unrelated resources.
---
# Folder Description
## /api
Contains application-specific backend API endpoints.
Example:
```text
api/
├── login.php
├── register.php
└── profile.php
```
APIs shared between multiple applications must be placed inside:
```text
/nesh/src/api
```
Application APIs should only contain logic related to their own module.
---
## /assets
Contains static files used by the application.
Assets should be organized by feature or purpose instead of file type.
Example:
```text
assets/
├── users/
├── headers/
└── careers/
```
Files should be grouped based on their usage context.
---
## /components
Contains reusable frontend components.
Each component must contain its own JavaScript and CSS files.
Example:
```text
components/
│
├── navbar/
│   ├── navbar.js
│   └── navbar.css
│
├── footer/
│   ├── footer.js
│   └── footer.css
│
└── carousel/
    ├── carousel.js
    └── carousel.css
```
Components must be:
* Independent
* Reusable
* Self-contained
* Not tied to a single page
---
## /pages
Contains application pages.
Each page contains:
* PHP template
* JavaScript logic
* CSS styling
Example:
```text
pages/
│
├── home/
│   ├── home.php
│   ├── home.js
│   └── home.css
│
├── contact-us/
│   ├── contact-us.php
│   ├── contact-us.js
│   └── contact-us.css
```
Each page keeps its own logic and styling.
This structure follows modern frontend architecture patterns where each feature contains its own implementation.
---
## /data
Contains static application data.
This directory does not contain database data.
Example:
```text
data/
├── countries-settings.json
├── languages.json
```
Database-related information must always be handled through backend services.
---
## /utils
Contains reusable JavaScript utility functions.
Example:
```text
utils/
├── validator.js
├── formatter.js
└── helper.js
```
Utilities must contain generic functions that are not related to a specific page or component.
---
# Shared Components and Theme
Each application can contain shared frontend resources.
Example:
```text
components/
└── shared/
    └── theme.css
```
The theme contains global CSS variables shared by components.
Example:
```css
:root {
    --primary: #0066ff;
    --background: #ffffff;
    --text: #111111;
}
```
Components should use theme variables instead of hardcoded values to maintain a consistent design system.
```
Configuration values should never be hardcoded inside PHP or JavaScript files.
Sensitive information such as:
* Database credentials
* Private API keys
* Secret tokens
must never be committed to public repositories.
---
# URL Routing and Rewrite System
## /.htaccess
Each application uses `.htaccess` to manage URL rewriting and routing.
The `.htaccess` file is responsible for:
* Removing `.php` extensions from URLs
* Mapping public URLs to internal PHP files
* Hiding internal folder structures
* Providing clean URLs
Example:
Internal structure:
```text
pages/
└── security/
    └── security.php
```
Public URL:
```text
www.example.com/security
```
Internal redirect:
```text
www.example.com/pages/security/security.php
```
The user never sees the internal PHP path.
---
## URL Mapping Example
| Public URL    | Internal File                      |
| ------------- | ---------------------------------- |
| `/security`   | `/pages/security/security.php`     |
| `/careers`    | `/pages/careers/careers.php`       |
| `/contact-us` | `/pages/contact-us/contact-us.php` |
PHP extensions are hidden from the browser.
Instead of:
```text
www.example.com/security.php
```
The application uses:
```text
www.example.com/security
```
This improves:
* URL readability
* SEO structure
* Separation between public routes and internal files
---
# Common Directory
The `/nesh` directory contains resources shared between all applications.
Shared logic must be placed here instead of duplicated between applications.
Example:
```text
nesh/
│
├── services/
├── components/
├── utils/
└── config/
```
Applications should reuse common resources whenever possible.
---
# Development Rules
* Each application must remain independent.
* Shared logic must not be duplicated.
* Components must be reusable.
* Pages must contain their own frontend logic and styling.
* Database operations must be handled by backend services.
* Public URLs must not expose internal PHP structure.
* Do not hardcode environment-specific values.