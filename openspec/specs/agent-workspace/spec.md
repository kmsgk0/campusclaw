# agent-workspace Specification

## Purpose
Provide class-scoped configurable learning assistants and persistent conversations.

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

### Requirement: Reproducible API use
The system MUST provide generated OpenAPI, interactive Swagger and runnable HTTP test scripts.

#### Scenario: Run the application
- **WHEN** Compose starts
- **THEN** the app and Qdrant are available
- **AND** Swagger documents authentication, request/response fields and errors
- **AND** the HTTP runner checks responses and persisted state and generates an ignored HTML report
