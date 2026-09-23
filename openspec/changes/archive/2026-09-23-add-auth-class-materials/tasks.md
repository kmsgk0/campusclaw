## 1. Configuration and data
- [x] 1.1 Create dependencies, persistent schema and seeds. verify: isolated initialization creates two classes and three hashed-password users; repeat initialization preserves data.

## 2. Authentication
- [x] 2.1 Implement login, identity, logout and login throttling. verify: successful/failed login, missing-session 401, logout revocation and throttling tests.

## 3. Materials and isolation
- [x] 3.1 Implement class-filtered list, detail and protected download. verify: A/B isolation, nonexistent equivalence and identical download bytes.
- [x] 3.2 Implement teacher upload with validation and transactional cleanup. verify: success, student 403, invalid files and injected DB failure leave expected state.

## 4. User interface
- [x] 4.1 Implement and verify login/material pages. verify: actual browser workflow, screenshots at 375/768/1440, both themes and list/grid, XSS rejection.

## 5. Delivery
- [x] 5.1 Add Compose and README. verify: Compose boot, health and down/up persistence.
- [x] 5.2 Prepare five coursework artifacts. verify: actual screenshots and implementation-based explanations with secrets removed.
- [x] 5.3 Run strict spec validation and final checks. verify: openspec validate, pytest and clean scoped Git status.
- [x] 5.4 Archive the completed change. verify: active list is empty and auth-materials appears in main specs after all preceding tasks pass.
