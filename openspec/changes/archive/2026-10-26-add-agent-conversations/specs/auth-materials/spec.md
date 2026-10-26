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
- **AND** five failures for one username and address temporarily block login for five minutes with the same 401 response

#### Scenario: Missing session and logout
- **WHEN** a protected API receives no Bearer token, a tampered token or an expired token
- **THEN** it returns 401 without business data
- **AND** Cookie and query-string credentials cannot grant access
- **WHEN** the browser has no valid token
- **THEN** it redirects to /login before showing protected material data

- **WHEN** a logged-in user logs out
- **THEN** the server revokes the token and the browser clears its stored token
- **AND** reuse of the old token returns 401

### Requirement: Reproducible runtime
The system MUST provide persistent seed data, Docker Compose and public GET /health.

#### Scenario: Seed and configuration
- **WHEN** the application starts for the first time
- **THEN** it creates A/B classes, teacher_a, teacher_b, student_a1, student_b1, distinguishable materials, and classes/users/materials/knowledge_entries/assignments/assistants/skills structures
- **AND** a single SQL schema directly defines all tables, including class-scoped skills and material index options
- **AND** repeated initialization preserves existing accounts, materials, skills and conversations
- **AND** a missing or short seed password or JWT signing secret causes an explicit startup failure

#### Scenario: Compose persistence
- **WHEN** a reader follows README to run Docker Compose, uploads a file, then runs down and up without deleting volumes
- **THEN** the login page and unauthenticated /health are available and uploaded data remains
