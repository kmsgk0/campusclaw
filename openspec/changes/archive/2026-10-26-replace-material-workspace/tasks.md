## 1. Frontend

- [x] 1.1 Organize login, workspace, retrieval, assistant and source dialogs into separate frontend modules.
- [x] 1.2 Connect username/password login, session expiry, authenticated downloads and server-side logout.
- [x] 1.3 Support material filters, list/grid views, upload, indexing state and retry, retrieval, answers and original-source navigation.
- [x] 1.4 Provide light/dark themes and narrow-screen reading and assistant controls.
- [x] 1.5 Provide resizable workspace columns with pointer and keyboard controls, width constraints and a 420 px default assistant width.

## 2. Runtime and documentation

- [x] 2.1 Configure frontend dependencies and the Vite development entry with Flask/Compose production assets.
- [x] 2.2 Document development commands, frontend structure and behavior in README.

## 3. Verification

- [x] 3.1 Pass existing API/knowledge tests (26 tests), the frontend build and strict OpenSpec validation.
- [x] 3.2 Check browser login, material actions, retrieval, source dialogs, themes and responsive login/reading layouts.
- [x] 3.3 Check unauthenticated access, student upload denial and cross-class access denial through the real APIs.
- [x] 3.4 Check live answers and source navigation, and exercise upload, indexing retry, Unicode highlighting and byte-identical downloads with an isolated test instance.
- [x] 3.5 Manually confirm pointer resizing and normal cursor restoration after release.
