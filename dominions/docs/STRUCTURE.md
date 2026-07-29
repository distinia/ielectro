# DOMINIONS
> This document defines the software architecture and development rules
> for the Dominios project.
## Overview
Dominios is a web application written with **PHP, CSS and Vanilla
JavaScript**. It starts as a map editor and evolves into a grand
strategy game inspired by Hearts of Iron IV, Europa Universalis IV and
Civilization.
## Technologies
-   PHP 8+
-   HTML rendered by PHP pages
-   CSS3
-   JavaScript ES6 (Vanilla)
-   Apache
-   MySQL
### Do NOT use
-   React
-   Next.js
-   Vue
-   Angular
-   Node.js
-   Express
-   TypeScript
-   npm
-   yarn
-   vite
-   webpack
## Configuration
-   App name: Dominios
-   URL: https://dominions.ielectro.com
-   Database host: database.ielectro.com
-   Database: ielectro
-   User: root
-   Table prefix: dominions\_
## Project Structure
``` text
dominions/
├── api/
├── assets/
├── components/
├── data/
├── pages/
├── services/
├── utils/
└── .htaccess
```
### api
REST endpoints only. No business logic.
### services
Contains all PHP classes.
Suggested structure:
``` text
services/
bootstrap.php
database/
auth/
request/
html/
maps/
countries/
game/
files/
validation/
utilities/
```
Bootstrap is **services/bootstrap.php**. Do not create
`/nesh/src/autoload.php`.
Existing base classes to use and extend:
-   Classes
-   Connection
-   Query
-   Schema
-   Request
-   Response
-   HTML
-   Auth
-   Cookie
-   Csrf
-   RateLimit
-   Security
-   Geolocation
-   Slug
-   Validate
### assets
Static resources organized by subject:
``` text
assets/
maps/
icons/
flags/
ui/
backgrounds/
manuals/
sounds/
```
Imported user maps are stored in `assets/maps/`.
### components
Each reusable component contains:
``` text
component/
component.php
component.css
component.js
```
### pages
Each page contains:
``` text
page/
page.php
page.css
page.js
```
Every page includes the bootstrap using `__DIR__`.
### utils
``` text
utils/
css/
scripts/
```
Shared CSS goes in `utils/css`. Shared JavaScript goes in
`utils/scripts`.
## Routing
Use the provided `.htaccess` example.
Requirements:
-   remove .php from URLs
-   map `/page` to `/pages/page/page.php`
-   hide internal folders
## Database
Use prefix `dominions_` for every table.
Examples:
-   dominions_maps
-   dominions_countries
-   dominions_games
-   dominions_players
-   dominions_territories
## MVP
Implement only:
-   Home
-   Map management
-   Image import
-   Map viewer
-   Zoom
-   Pan
-   Placeholder territory selection
## Future
-   Diplomacy
-   Economy
-   Army
-   War
-   Population
-   AI
-   Technology
-   Resources
## UI
Target style:
-   Dark theme
-   Inspired by Hearts of Iron IV and the provided reference image
-   Large strategy map
-   Left navigation panel
-   Top information bar
-   Floating windows
-   Clean icons
-   Modern game-like interface
## Rules
-   SOLID
-   DRY
-   KISS
-   Clean Code
-   Reusable components
-   Modular architecture
Business logic belongs only in `services`.
API endpoints only call service classes.
Never generate React, Node.js or TypeScript code.
Act as a senior software architect and always prefer scalable solutions.
