also remove /public/ this folder do not exist nowhere anymore


THEN:

Refactor the Nesh routing system to make it completely independent from the way an application is exposed on the web.

## Goal

The current routing assumes that the application is always hosted on its own subdomain.

For example:

https://dyscover.ielectro.com/api/posts

The router currently interprets:

/api/posts

correctly because the application is mounted at the domain root.

However, in the future the same application may be hosted under a subdirectory:

https://www.example.com/dyscover/api/posts

In that situation, the router must still interpret the application route as:

/api/posts

The routing system must therefore understand the application's base path and remove it before parsing route segments.

---

# Required architecture

The Router must NEVER assume that the first URL segment belongs to the application.

The router must work relative to the application's mount point.

These two URLs must produce exactly the same routing result:

https://dyscover.ielectro.com/api/posts

https://www.example.com/dyscover/api/posts

Both must internally become:

/api/posts

Therefore:

Routing::segment(0) => api
Routing::segment(1) => posts

The application code must not need to change between the two hosting configurations.

---

# App configuration

The application must expose its base path/mount point through the App configuration.

For example:

Subdomain deployment:

URL:
https://dyscover.ielectro.com

Base path:
/

Subdirectory deployment:

URL:
https://www.example.com/dyscover

Base path:
/dyscover/

Do not hardcode `/dyscover` inside the Router.

Do not hardcode any application name or folder inside the Router.

The Router must receive or determine the current application's base path dynamically.

---

# Routing behavior

The Router should:

1. obtain the current request URI
2. determine the application's base path
3. remove the application's base path from the request URI
4. normalize the remaining path
5. parse the remaining path into segments

Example:

REQUEST_URI:

/dyscover/api/posts?page=2

Application base path:

/dyscover

Normalized application path:

/api/posts

Result:

Routing::segment(0) => api
Routing::segment(1) => posts

Query parameters must remain available separately.

---

# Subdomain example

For:

https://dyscover.ielectro.com/api/posts

Base path:

/

The router must produce:

/api/posts

Exactly the same result.

---

# Important

Do NOT rewrite the application's business logic.

Do NOT modify API endpoint behavior.

Do NOT modify controllers.

Do NOT modify existing endpoint names.

Do NOT introduce application-specific routing logic.

Do NOT create separate routing implementations for subdomains and subdirectories.

There must be ONE generic routing implementation.

---

# App

Update Nesh\App if necessary so it can expose the application's:

- public URL
- base path
- folder
- other routing information required by the Router

Keep the existing App architecture and naming conventions.

Do not introduce unnecessary properties or abstractions.

---

# URLs and assets

Review any existing URL/path generation that assumes the application is mounted at `/`.

Where appropriate, use the application's base path instead.

The same application should be able to work under:

https://dyscover.ielectro.com/

and:

https://www.example.com/dyscover/

without changing application code.

Do not break absolute URLs such as:

https://dyscover.ielectro.com/api

when the application is deployed on its own subdomain.

---

# Compatibility

All existing calls such as:

Routing::segment(0)
Routing::segment(1)
Routing::segment(2)

must continue working exactly as before.

Only the source of the route path should change.

Existing applications must continue working:

- account
- admin
- dyscover
- dominions
- www

---

# Security

The implementation must correctly normalize paths and must not allow the base path removal logic to create path traversal or malformed routes.

Handle:

- trailing slashes
- duplicate slashes
- query strings
- empty paths
- URL-encoded paths
- root application paths
- subdirectory application paths

Do not use fragile string replacement that could remove `/app` from an unrelated part of the URL.

The base path must only be removed from the beginning of the request path.

---

# Cleanup

After implementing the new routing architecture:

- remove obsolete routing assumptions
- remove duplicated routing logic
- remove unused code
- remove unnecessary constants
- keep everything Object-Oriented
- keep the implementation simple

Do not create standalone helper functions.

All logic must belong to the appropriate class.

---

# Final requirement

The important architectural rule is:

THE APPLICATION MUST NOT CARE WHETHER IT IS HOSTED AT THE DOMAIN ROOT OR INSIDE A SUBDIRECTORY.

These:

https://dyscover.ielectro.com/api/posts

and:

https://www.example.com/dyscover/api/posts

must be indistinguishable to the application after routing normalization.

The final routing system must be portable, generic, scalable, and independent from the hosting environment.


