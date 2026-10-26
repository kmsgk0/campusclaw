## Context

Agents already select skills, retrieve bound materials and stream saved conversations. Tool integration extends this turn-processing flow using tools discovered from connected servers.

## Decisions

- Run a separate HTTP JSON-RPC service with health, initialize, tools/list and tools/call endpoints and Bearer authentication.
- Provide `formula_hint` using keyword-based learning guidance and `unit_convert` using a unit table. Keep the tools usable independently of the chat model.
- Store class-scoped server settings and discover tool descriptions and input schemas on connection. Disconnecting clears discovery and refuses subsequent calls.
- Validate tool-reference syntax, class ownership, connection and discovery when saving a skill; authorize again before execution.
- Send only the current skill's allowed tool declarations to the model. Map model-side names to discovered tools, validate arguments, execute calls and return tool messages.
- Limit rounds and cumulative calls. Bound returned text and treat tool output as data; failed or refused calls remain visible and do not prevent a final answer.
- Stream tool progress before answer deltas and save outcomes with messages. Teachers can inspect their class's tool, server, outcome, user, conversation, round and time without seeing credentials.
- Extend existing OpenAPI annotations, HTTP checks and browser workflows for the new endpoints and tool interactions.

## Verification

Check authenticated discovery, two tool schemas, connection changes, class boundaries, argument validation, execution limits and call records. Verify real model-requested calls and successful, failed and refused outcomes through the application.
