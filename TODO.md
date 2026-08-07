```text
Please address the following issues without changing the existing architecture or business logic.

## 1. Profile

After updating any profile field, the remaining actions stop working.

Example:

- Update username → works.
- Afterwards, changing email, password, or any other field no longer works.

Investigate the cause and ensure every Profile action continues working independently after any successful update.

---

## 2. Google OAuth Flow

Remove the Google Client ID dependency currently defined inside `autoload.php`.

It is unnecessary for the current architecture.

Google authentication already returns all the information we need:

- email
- given_name
- full_name

Use these values directly.

The expected flow is:

1. Authenticate with Google.
2. Send the returned user information to:

```

POST /api/oauth/google

```

3. If the account already exists, complete the login normally.
4. If the account does not exist, redirect to the `oauth-create` page.
5. On `oauth-create`, retrieve the pending OAuth data using:

```

GET /api/oauth/google

```

This endpoint should provide the pending values (email, username, etc.).

6. Complete account creation using:

```

POST /api/user

```

Do not introduce any unnecessary client-side Google configuration.

---

## 3. Password & Email Update

The Profile page currently cannot update the user's password.

Implement password updates correctly.

Also, when the user changes their email address, the new email must always go through the verification process before becoming active.

Email verification should behave consistently with the account creation flow.

---

## 4. Profile UI

The expand/collapse arrow used for the Profile rows is almost invisible.

Replace it with a clearer and more visible icon that matches the application's design language.
```
