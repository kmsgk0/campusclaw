## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Reproducible API use
The system MUST provide generated OpenAPI, interactive Swagger and runnable HTTP test scripts.

#### Scenario: Run the application
- **WHEN** Compose starts
- **THEN** the app, Qdrant and a tool server with at least two tools are available
- **AND** Swagger documents authentication, request/response fields and errors
- **AND** the HTTP runner checks responses and persisted state and generates an ignored HTML report
