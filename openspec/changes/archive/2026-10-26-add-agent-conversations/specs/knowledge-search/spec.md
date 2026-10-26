## MODIFIED Requirements

### Requirement: Integrated retrieval and assistant workspace
The system MUST expose existing class-scoped retrieval, answers and protected original sources through the material workspace using the documented retrieval and model interfaces.

#### Scenario: Retrieval navigation
- **WHEN** a user searches with keyword, vector or hybrid mode and navigates to another workspace section and back
- **THEN** the submitted search, results, pagination and errors remain available
- **AND** each result can open the full material or its highlighted original source

#### Scenario: Reader and question page
- **WHEN** a user opens the reader-side assistant or the question page
- **THEN** the question page provides grounded independent answers through POST /api/ask and the reader-side assistant provides persisted agent conversations
- **AND** the grounded answer uses the current question and the agent conversation uses bounded saved history

#### Scenario: Independent errors and sources
- **WHEN** retrieval or answering fails
- **THEN** the actual error is displayed on its affected surface without replacing unrelated successful results
- **AND** failed questions remain available for correction and no fabricated answer is substituted
- **WHEN** a user opens and closes a cited original source
- **THEN** the protected material's exact Unicode range is highlighted and closing the dialog leaves the workspace usable
