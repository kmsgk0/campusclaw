# Functional specifications

## Current behavior

- [Authentication and materials](specs/auth-materials/spec.md): accounts, class access, uploads and the material workspace.
- [Knowledge retrieval](specs/knowledge-search/spec.md): processing strategies, indexes, retrieval and original-source citations.
- [Agents and tools](specs/agent-workspace/spec.md): prompts, skills, conversations, MCP execution and API documentation.

## Completed changes

The sequence below follows functional dependencies. Directory dates identify archive dates.

| Sequence | Change | Scope |
| --- | --- | --- |
| 1 | [Authentication and class materials](changes/archive/2026-09-23-add-auth-class-materials/proposal.md) | Seeded accounts, teacher/student permissions, uploads and persistent runtime |
| 2 | [Bearer authentication](changes/archive/2026-09-30-add-bearer-token-auth/proposal.md) | JWT sessions and authenticated API access |
| 3 | [Class knowledge retrieval](changes/archive/2026-09-30-add-class-knowledge-search/proposal.md) | Keyword/vector/hybrid search and grounded answers |
| 4 | [Material workspace](changes/archive/2026-10-26-replace-material-workspace/proposal.md) | Reading interface, source navigation, themes and resizable columns |
| 5 | [Configurable material processing](changes/archive/2026-10-26-enhance-material-processing/proposal.md) | Chunk strategies, source mapping, inspection and rebuild |
| 6 | [Agents and conversations](changes/archive/2026-10-26-add-agent-conversations/proposal.md) | Prompts, imported skills, bindings, private SSE conversations and documented APIs |
| 7 | [MCP tool integration](changes/archive/2026-10-26-add-mcp-tool-integration/proposal.md) | Connected services, model-directed calls, execution results and call records |

Each change includes its proposal, design, requirement deltas and tasks. Current behavior is defined by `specs/`; archived deltas show the scope of each completed change.
