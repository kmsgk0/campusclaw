# agent-workspace Specification

## Purpose
Provide configurable class assistants, reusable guidance, persistent conversations and authorized external tools within the material workspace.

## Requirements

### Requirement: Agents and skills
The system MUST allow teachers to manage class-scoped agents, prompts, skill files and material bindings.

#### Scenario: Configure an agent
- **WHEN** a teacher creates or edits an agent
- **THEN** its name is unique within the class and all bound objects belong to that class
- **AND** students can select only enabled agents and cannot modify configuration

#### Scenario: Route a skill
- **WHEN** a user asks a question
- **THEN** only enabled skills bound to the conversation's agent are scored by trigger keywords
- **AND** at most one skill is selected, ties use the lower ID, and zero matches select none
- **AND** guidance skills provide a next step without the final answer

### Requirement: Persistent streamed conversations
The system MUST persist private conversations and stream assistant responses with verifiable citations.

#### Scenario: Continue a conversation
- **WHEN** its owner sends a message
- **THEN** the conversation keeps its original agent and uses current bindings and prompt
- **AND** the last six messages provide bounded history
- **AND** another user or class receives the same 404 as an unknown conversation

#### Scenario: Stream an answer
- **WHEN** generation succeeds
- **THEN** metadata precedes incremental text and done follows message persistence
- **AND** references point only to bound authorized materials
- **WHEN** retrieval returns no evidence
- **THEN** the agent still answers with empty citations and no numbered source markers
- **WHEN** generation fails after streaming starts
- **THEN** an error event identifies the interruption and any partial answer remains visibly incomplete

### Requirement: External tools
The system MUST connect an authenticated MCP service and let models request only authorized discovered tools.

#### Scenario: Connect and bind
- **WHEN** a teacher connects a registered server
- **THEN** initialize and tools/list must both succeed before the tool list is replaced and the connection enabled
- **AND** tool references are checked for valid syntax, ownership, connection and discovery before saving skills
- **WHEN** the teacher disconnects
- **THEN** the discovery list is cleared and subsequent calls are refused

#### Scenario: Execute model tool calls
- **WHEN** the model requests a bound tool
- **THEN** the host validates its arguments against the discovered schema and sends authenticated tools/call
- **AND** tool results or failures return as tool messages, with untrusted instructions rejected and long results bounded
- **AND** round and cumulative call limits stop further tools while allowing a final answer
- **AND** call progress precedes answer text

#### Scenario: Inspect calls
- **WHEN** a teacher views call records
- **THEN** only the teacher's class records appear with tool, server, outcome, user, conversation, round and time
- **AND** credentials never appear in API responses or records

### Requirement: Reproducible API use
The system MUST provide generated OpenAPI, interactive Swagger and runnable HTTP test scripts.

#### Scenario: Run the application
- **WHEN** Compose starts
- **THEN** the app, Qdrant and a tool server with at least two tools are available
- **AND** Swagger documents authentication, request/response fields and errors
- **AND** the HTTP runner checks responses and persisted state and generates an ignored HTML report
