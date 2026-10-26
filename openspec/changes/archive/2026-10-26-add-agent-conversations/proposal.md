## Why

Students need learning assistants with distinct roles and reusable guidance, while teachers need to control each assistant's skills and reference materials. Conversations should retain their history and show answers as they arrive.

## What Changes

- Add class-scoped agents, editable role prompts, skill files and material bindings.
- Select at most one enabled bound skill for each question.
- Persist private conversations and stream answers with source citations.
- Use agent conversations in the reader-side assistant while retaining independent grounded questions.
- Complete account identity, login throttling and seed configuration behavior.
- Provide generated OpenAPI, local Swagger assets and HTTP checks for the available APIs.

## Capabilities

### New Capabilities
- `agent-workspace`: configurable assistants, skills, private streamed conversations and documented APIs.

### Modified Capabilities
- `auth-materials`: account identity, invalid-login behavior and reproducible seed configuration.
- `knowledge-search`: integrate persistent agent conversations into the reading workspace.

## Dependencies

Build on `enhance-material-processing` for configurable material retrieval and `replace-material-workspace` for the reading interface.

## Impact

Add SQLite agent, binding, skill, conversation and message storage. Extend the Flask APIs and React workspace without replacing materials, existing accounts or grounded single-question answers.
