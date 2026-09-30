## Context

The app already stores hashed session tokens with expiry in SQLite. Authorization derives users, roles and classes from that database. Downloads currently use a plain link.

## Decisions

Use PyJWT with a fixed HS256 algorithm and a server-only JWT_SECRET of at least 32 bytes. JWTs contain subject, issued-at time, expiry and a random identifier. Keep the existing hashed session registry so logout immediately revokes a token. Do not accept Cookie or query-string credentials.

The frontend stores its token in sessionStorage, attaches Authorization to API requests, and clears it on logout or 401. HTML navigation does not carry this header, so the frontend checks identity before displaying the workspace and redirects unauthenticated users to login. Downloads fetch the protected file with the same header before saving the returned bytes.

## Verification

Use the existing permission/upload tests with Bearer authentication. Check tampered, expired and revoked tokens. Verify login, refresh, reading, downloading and logout through the browser. Verify teacher uploads, student rejection and cross-class isolation through the API tests.
