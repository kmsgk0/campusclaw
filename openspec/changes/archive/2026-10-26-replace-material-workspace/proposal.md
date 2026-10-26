## Why

Teachers and students need an integrated workspace for browsing materials, reading original text and asking questions. The interface combines these activities with authenticated access and class-scoped permissions.

## What Changes

- Replace the Radix Themes frontend with a modular React workspace using Radix Dialog/Tabs primitives, Lucide icons and Geist.
- Provide sidebar navigation, a material catalogue, a document reader and an optional assistant. Selected sidebar items use no vertical stripe, and the interface uses no flattened oval pale-blue capsules.
- Authenticate entered usernames and passwords through the API in both development and production.
- Retain light/dark themes, list/grid views, uploads, index retry, download, retrieval, answers and original-source highlighting.
- Make adjacent workspace columns resizable with pointer and keyboard controls, and widen the assistant's default presentation.
- Add a Vite development entry that proxies the existing backend, and keep Flask/Compose serving the production build.

## Capabilities

### Modified Capabilities

- `auth-materials`: replace the material workspace presentation and preserve authenticated teacher/student flows, responsive rendering and themes.
- `knowledge-search`: expose retrieval and answers through dedicated pages and a reading-side assistant, with independent request state and verifiable source dialogs.

## Impact

Frontend source, frontend dependencies, local development entry and README change. Existing APIs, database schema, persistent volumes, model configuration and authorization rules remain in use.
