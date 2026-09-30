## Why

Clients need to authenticate API and file requests explicitly through `Authorization: Bearer`. Replace Cookie authentication while preserving session expiry, logout revocation and class isolation.

## What Changes

- Return an expiring JWT from login and authenticate protected APIs through the Bearer header.
- Keep server-side session revocation and database-derived role and class permissions.
- Store the token in browser sessionStorage and attach it to material requests, including downloads.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `auth-materials`: replace Cookie authentication with Bearer authentication while retaining permissions and workflows.

## Impact

Authentication, frontend requests and downloads, JWT dependency and signing configuration, existing tests, and README. No retrieval functionality is added.
