# auth-materials Specification

## Purpose
Provide teachers and students with authenticated, class-isolated access to teaching materials, including teacher uploads, readable knowledge text and protected downloads.

## Requirements

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

### Requirement: Class and role authorization
The system MUST derive class and role from authenticated server-side user data.

#### Scenario: Class-scoped reads
- **WHEN** an A-class user requests a list, detail or file
- **THEN** only A-class data is accessible, even with a supplied B class_id
- **AND** B-class and nonexistent material IDs both return the same 404 body

#### Scenario: Student upload
- **WHEN** a student uploads a valid file
- **THEN** the API returns 403 and both tables and the upload directory are unchanged

### Requirement: Material ingestion and download
The system MUST accept teacher uploads of UTF-8 txt/md files no larger than 2 MiB and store material metadata and knowledge text atomically, then build a retrievable index.

#### Scenario: Upload and read
- **WHEN** a teacher uploads a valid file
- **THEN** materials and knowledge_entries are committed for the teacher's class
- **AND** successful indexing marks the material ready for retrieval
- **AND** same-class users can read and download identical bytes

#### Scenario: Index service failure
- **WHEN** indexing fails after material storage
- **THEN** the response explicitly reports that storage succeeded but indexing failed
- **AND** the original material remains accessible and can be indexed again by its class teacher

#### Scenario: Invalid upload
- **WHEN** the extension, size, encoding or contents violate existing limits
- **THEN** the existing 415, 413 or 400 response leaves neither material rows nor files

#### Scenario: Database failure
- **WHEN** database insertion fails during material storage
- **THEN** both table changes roll back, the new file is removed and an explicit 500 response is returned

#### Scenario: Authorized files only
- **WHEN** someone requests a file without a valid token or from another class
- **THEN** the download returns 401 or 404 without file content
- **AND** no public uploads path exposes files

### Requirement: Usable material interface
The system MUST provide a username/password login page and the material workspace using server-confirmed identity and Bearer-authenticated API requests.

#### Scenario: Teacher and student workflows
- **WHEN** the teacher uses the page
- **THEN** login, upload, title/body search, combined file-type filtering, detail, download and logout work with the token
- **AND** refresh in the same tab preserves the login state
- **WHEN** the student uses the page
- **THEN** the page offers read-only access, and direct upload calls are still denied

#### Scenario: Real login and rejected session
- **WHEN** a user submits username and password
- **THEN** the browser authenticates through POST /api/login without a role-selection shortcut or injected seed password
- **WHEN** no token exists or a protected request rejects the token
- **THEN** the browser returns to /login and does not show protected material data
- **WHEN** a logged-in user signs out
- **THEN** the server revokes the token and the browser returns to /login with its token cleared

#### Scenario: Responsive and safe rendering
- **WHEN** the viewport is 375, 768 or 1440 pixels wide
- **THEN** login and material pages remain usable without horizontal overflow
- **AND** light/dark and list/grid controls work, and Markdown scripts never execute
- **AND** narrow-screen users can return from reading to material selection and open the assistant

#### Scenario: Workspace presentation
- **WHEN** the workspace is rendered
- **THEN** sidebar navigation, the material catalogue, the document reader and the optional assistant are displayed with their metadata, counters and actions
- **AND** selected sidebar items have no vertical stripe and the interface has no flattened oval pale-blue capsule
- **AND** login has no preview capsule, English eyebrow, footer brand/tagline or demo-account note
- **AND** the sidebar privacy card and material-footer privacy note are absent

#### Scenario: Shared themes
- **WHEN** a user changes the light/dark theme
- **THEN** login, workspace, reader, forms and dialogs use the selected theme
- **AND** light remains the default and the selection survives page navigation and refresh

#### Scenario: Resizable workspace columns
- **WHEN** the material catalogue, reader and assistant are visible side by side
- **THEN** users can drag the separators to resize adjacent columns or use Left/Right keys while a separator has focus
- **AND** resizing keeps usable minimum widths without horizontal page overflow
- **AND** the assistant defaults to a width of 420 px
- **WHEN** a user releases the primary pointer button after resizing
- **THEN** resizing stops and pointer capture and pointer-acquired separator focus are released
- **AND** moving outside the separator restores the normal cursor without another click
- **AND** keyboard users can still focus the separator and adjust it with Left/Right keys
- **WHEN** a user switches workspace sections or closes and reopens the assistant
- **THEN** the selected column widths remain available during the current page session
- **WHEN** the viewport switches to the narrow-screen material list/reader layout
- **THEN** separators are hidden and the existing reading and assistant-sheet controls remain usable

### Requirement: Reproducible runtime
The system MUST provide persistent seed data, Docker Compose and public GET /health.

#### Scenario: Seed and configuration
- **WHEN** the application starts for the first time
- **THEN** it creates A/B classes, teacher_a, student_a1, student_b1, distinguishable materials, and classes/users/materials/knowledge_entries/assignments/assistants/skills structures
- **AND** a missing or short seed password or JWT signing secret causes an explicit startup failure

#### Scenario: Compose persistence
- **WHEN** a reader follows README to run Docker Compose, uploads a file, then runs down and up without deleting volumes
- **THEN** the login page and unauthenticated /health are available and uploaded data remains
