## Context

The React/Vite frontend uses the Flask API for authentication, class-scoped materials, retrieval and answers. The workspace combines a material catalogue, document reader and assistant, with light/dark themes and responsive layouts.

## Decisions

### Frontend boundaries

Use React and Vite. Separate API access, login, workspace, retrieval, assistant and original-source display into modules. Use Radix primitives for modal focus and tabs, and keep native controls for forms and file selection.

### Authentication and development

Use `/login` and `/` as the application entries. Submit the entered username and password to `/api/login`, keep the Bearer token in the existing `campus_token` sessionStorage key, and load server-confirmed identity through `/api/me`. Missing or rejected sessions return to `/login`; logout revokes the token through the server before clearing it. Download requests use the same authenticated request helper.

Vite serves a local HTML entry and proxies `/api` to the existing backend. The existing origin check is satisfied by the local proxy. Development and production use the same username/password authentication flow; credentials are entered by the user. Production assets keep the existing `/static/dist/app.js` and `/static/dist/app.css` contract, so Flask and Compose retain their build path.

### Presentation and state

Arrange sidebar navigation, the material catalogue, the document reader and the optional assistant in adjacent columns. Keep document metadata, counters and actions alongside their associated content. Theme controls belong to the shared application frame; light is the default, and the chosen theme remains available across login navigation and refresh.

Title/body search and file-type filters combine in the catalogue. Retrieval results survive navigation away from and back to retrieval. Each question remains independent at the API boundary; previous displayed exchanges do not become model context. Loading, errors and results belong to their respective operations. A failed answer keeps its question available for correction and never fabricates a substitute response.

Original-source dialogs fetch protected material text, use Unicode character ranges for highlighting, and close without retaining an invalid source reference. Markdown continues to use the backend's sanitized rendered HTML. Narrow screens retain material selection, reading, upload and assistant access.

The catalogue and assistant widths are user-adjustable through separators, with the reader taking the remaining space. The assistant defaults to 420 px. Pointer capture keeps drags attached to their separator; keyboard arrows provide the same adjustment. Container measurements constrain the catalogue to at least 200 px and the reader and assistant to at least 320 px each when present. Selected widths live in workspace state, so navigation and assistant visibility changes preserve the user's adjustment without persisting a new browser preference. The existing single-column mobile layout hides the separators.

## Verification

Run the existing API and knowledge tests, the frontend build and strict OpenSpec validation. Verify the production-served interface in a real browser for login, upload, search, read, byte-identical download, source highlighting, logout, theme switching and responsive layouts. Verify unauthenticated access, student upload denial and cross-class access denial through the existing real APIs. Exercise successful answers and upstream failures, checking that the interface displays each result or error accurately.
