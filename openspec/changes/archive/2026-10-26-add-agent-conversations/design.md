## Context

The application provides authenticated materials, configurable indexing and grounded single-question answers. Agents add teacher-controlled roles and persistent student conversations to that foundation.

## Decisions

- Keep Flask, SQLite, Qdrant and the existing React workspace. Add agent-related tables without removing stored materials. Keep the Flask application modules in `backend/`. Define all tables in `backend/schema.sql`; `backend/storage.py` owns schema initialization and seeds accounts, materials, skills and agents idempotently.
- Store agents, prompts, bindings, skills, conversations and messages in SQLite. Only teachers manage class configuration; students select enabled agents from their own class.
- Fix the selected agent when a conversation is created. Read current prompt and bindings on each turn; disabling an agent prevents new selection while existing conversations remain usable.
- Parse Chinese skill metadata followed by a blank line and instructions. Score enabled bound skills by matching trigger keywords; select at most one, use lower ID for ties, and select none at zero matches.
- Retrieve only bound materials and apply the selected skill's material scope. Include up to six recent messages, each up to 500 characters.
- Keep the grounded single-question endpoint. Agent conversations can answer without retrieved evidence but must not invent citation numbers.
- Send metadata before text deltas and send completion after saving the answer. Persist interrupted answers with an explicit incomplete state.
- Use server-confirmed identity, immediate logout revocation, bounded login throttling and explicit seed-configuration errors.
- Generate OpenAPI from route annotations and serve Swagger assets locally. HTTP checks verify responses and persisted state; their HTML output remains ignored.

## Verification

Check account and class boundaries, agent configuration, skill import/routing, private conversation ownership, history recovery, streamed events and citations. Exercise teacher and student flows in the browser, including skill enable/disable behavior and answers without retrieved evidence.
