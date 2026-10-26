## Why

Learning assistants need to use external tools selected by the model, with teacher-managed connections and visible execution results.

## What Changes

- Add a Compose MCP service with authenticated discovery and at least two learning tools.
- Let teachers register, connect, discover and disconnect class-scoped tool servers.
- Bind discovered tools to skills and expose their schemas to the model.
- Execute authorized model tool calls, return results as tool messages and bound the call loop.
- Show tool progress before answer text and provide class-scoped call records.
- Extend Swagger and HTTP checks to MCP management and execution.

## Capabilities

### Modified Capabilities
- `agent-workspace`: external tools, model-directed execution, call records and tool-service runtime.

## Dependencies

Extend `add-agent-conversations`; skill bindings, streamed responses and saved conversations provide the host for tool execution.

## Impact

Add `mcp-server/`, a Compose service and host-side tool access. Extend agent orchestration, teacher management, API documentation and tests. Keep model and tool credentials on the server.
