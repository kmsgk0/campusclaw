# auth-materials Specification

## Purpose
Provide teachers and students with authenticated, class-isolated access to teaching materials, including teacher uploads, readable knowledge text, protected downloads and reproducible coursework evidence.

## Requirements

### Requirement: Account authentication
The system MUST authenticate seeded users with hashed passwords and an expiring, revocable server-side session.

#### Scenario: Login and identify
- **WHEN** a seeded teacher or student logs in with correct credentials
- **THEN** the response is 200 and sets an HttpOnly, SameSite=Lax session Cookie
- **AND** GET /api/me returns the user's id, role and class without password or session secrets

#### Scenario: Invalid credentials and throttling
- **WHEN** credentials are wrong or the user does not exist
- **THEN** the response is the same 401 message and creates no session
- **AND** ten failures from one address cause 429 for five minutes

#### Scenario: Missing session and logout
- **WHEN** no valid session is supplied
- **THEN** protected APIs return 401 without business data and protected pages redirect to /login
- **WHEN** the user logs out
- **THEN** reuse of the old Cookie returns 401

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
The system MUST accept teacher uploads of UTF-8 txt/md files no larger than 2 MiB and store material metadata and knowledge text atomically.

#### Scenario: Upload and read
- **WHEN** a teacher uploads a valid file
- **THEN** one materials row and one linked knowledge_entries row are committed for the teacher's class
- **AND** same-class students see it in the database-backed list, read the body and download identical bytes

#### Scenario: Invalid upload
- **WHEN** the extension is not txt/md, the file exceeds 2 MiB, or the text is empty, invalid UTF-8 or contains NUL
- **THEN** the API returns 415, 413 or 400 respectively with a readable error
- **AND** neither database rows nor files remain from the rejected upload

#### Scenario: Database failure
- **WHEN** database insertion fails during upload
- **THEN** both table changes roll back, the new disk file is removed and an explicit 500 response is returned

#### Scenario: Authorized files only
- **WHEN** someone requests a file without a valid session or from another class
- **THEN** the download returns 401 or 404 respectively without file content
- **AND** no public /uploads path exposes files

### Requirement: Usable material interface
The system MUST provide a login page and material workspace using server-confirmed identity.

#### Scenario: Teacher and student workflows
- **WHEN** the teacher uses the page
- **THEN** login, upload, list, search, detail, download and logout work
- **WHEN** the student uses the page
- **THEN** the page offers read-only access, and direct upload calls are still denied

#### Scenario: Responsive and safe rendering
- **WHEN** the viewport is 375, 768 or 1440 pixels wide
- **THEN** login and material pages remain usable without horizontal overflow
- **AND** light/dark and list/grid controls work, and Markdown scripts never execute

### Requirement: Reproducible runtime and evidence
The system MUST provide persistent seed data, Docker Compose, public GET /health and reproducible verification evidence.

#### Scenario: Seed and configuration
- **WHEN** the application starts for the first time
- **THEN** it creates A/B classes, teacher_a, student_a1, student_b1, distinguishable materials, and classes/users/materials/knowledge_entries/assignments/assistants/skills structures
- **AND** required missing password configuration causes an explicit startup failure

#### Scenario: Compose persistence
- **WHEN** a reader follows README to run Docker Compose, uploads a file, then runs down and up without deleting volumes
- **THEN** the login page and unauthenticated /health are available and uploaded data remains

#### Scenario: Coursework evidence
- **WHEN** the five week-three homework artifacts are prepared
- **THEN** they contain actual teacher-home, login request/response, authenticated request and unauthorized-download evidence, plus implementation-based upload/download analysis
- **AND** passwords and active session values are not published
