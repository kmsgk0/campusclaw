## MODIFIED Requirements

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
