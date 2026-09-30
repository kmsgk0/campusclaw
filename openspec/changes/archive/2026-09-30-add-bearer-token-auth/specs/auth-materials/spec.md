## MODIFIED Requirements

### Requirement: Account authentication
The system MUST authenticate seeded users with hashed passwords and an expiring JWT supplied only through an Authorization Bearer header, with immediate server-side revocation on logout.

#### Scenario: Login and identify
- **WHEN** a seeded teacher or student logs in with correct credentials
- **THEN** the response is 200 with token, token_type Bearer and expires_in
- **AND** no authentication Cookie is set
- **AND** GET /api/me with the token returns server-confirmed identity without password or session secrets

#### Scenario: Invalid credentials and throttling
- **WHEN** credentials are wrong or the user does not exist
- **THEN** the response is the same 401 message and creates no session
- **AND** ten failures from one address cause 429 for five minutes

#### Scenario: Missing session and logout
- **WHEN** a protected API receives no Bearer token, a tampered token or an expired token
- **THEN** it returns 401 without business data
- **AND** Cookie and query-string credentials cannot grant access
- **WHEN** the browser has no valid token
- **THEN** it redirects to /login before showing protected material data

- **WHEN** a logged-in user logs out
- **THEN** the server revokes the token and the browser clears its stored token
- **AND** reuse of the old token returns 401

### Requirement: Usable material interface
The system MUST provide a login page and material workspace using server-confirmed identity and Bearer-authenticated API requests.

#### Scenario: Teacher and student workflows
- **WHEN** the teacher uses the page
- **THEN** login, upload, list, search, detail, download and logout work with the token
- **AND** refresh in the same tab preserves the login state
- **WHEN** the student uses the page
- **THEN** the page offers read-only access, and direct upload calls are still denied

#### Scenario: Responsive and safe rendering
- **WHEN** the viewport is 375, 768 or 1440 pixels wide
- **THEN** login and material pages remain usable without horizontal overflow
- **AND** light/dark and list/grid controls work, and Markdown scripts never execute
