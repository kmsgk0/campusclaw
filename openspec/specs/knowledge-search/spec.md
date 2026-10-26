# knowledge-search Specification

## Purpose
Provide class-scoped knowledge retrieval and concise answers with verifiable original-material citations.

## Requirements

### Requirement: Persistent traceable indexing
The system MUST index original TXT/Markdown text into configurable auto, custom or Markdown hierarchy chunks with original Unicode source ranges, keyword tokens and persistent vectors.

#### Scenario: Index and reuse
- **WHEN** a teacher uploads material or runs the backfill command
- **THEN** every nonempty chunk is stored with material identity, ordinal and exact original range
- **AND** successful embeddings are reused for unchanged chunk text with the same provider/model/dimension within the class, including after restart or duplicate upload

#### Scenario: Failed indexing
- **WHEN** the external index or embedding request fails
- **THEN** the material remains readable, its index status is failed and the failure is explicitly reported
- **AND** a teacher may retry their own class material without duplicating successful embedding calls

### Requirement: Class-scoped retrieval
The system MUST support keyword, vector and hybrid retrieval only over ready materials belonging to the authenticated user's class.

#### Scenario: Search and paginate
- **WHEN** a user searches a nonempty query with a valid mode and page
- **THEN** keyword mode uses no model call, vector mode rejects similarity below 0.35, and hybrid uses RRF k=60
- **AND** results include material title, original filename, chunk ordinal, exact text, offsets and a protected source URL
- **AND** pagination covers all retained hits without duplication

#### Scenario: Access and invalid requests
- **WHEN** no valid Bearer token is supplied
- **THEN** the API returns 401
- **WHEN** an empty query, invalid mode or invalid page is supplied
- **THEN** the API returns 400
- **WHEN** a client specifies another class
- **THEN** it cannot override the authenticated class on either retrieval path or source access

#### Scenario: Question words
- **WHEN** the only shared keyword tokens are generic question words such as 什么
- **THEN** those tokens alone do not count as keyword evidence

### Requirement: Grounded concise answers
The system MUST retrieve with the current question in hybrid mode and provide at most four authorized chunks to the configured chat service.

#### Scenario: Answer with citations
- **WHEN** relevant chunks are available
- **THEN** the answer refers to sources using numbered citations whose numbers match backend-provided source records
- **AND** the browser shows the question, answer, complete cited chunks and protected source navigation

#### Scenario: No evidence
- **WHEN** no authorized chunk passes retrieval
- **THEN** the answer is 资料中未找到相关内容 and citations is empty
- **AND** the chat service is not called

#### Scenario: Insufficient retrieved evidence
- **WHEN** the model explicitly reports that retrieved material cannot answer the question
- **THEN** the fixed no-evidence message and empty citations are returned

#### Scenario: Service and answer errors
- **WHEN** the service fails, returns a truncated answer or cites nonexistent sources
- **THEN** an explicit error is returned without a fabricated answer, automatic retry or provider switch
- **AND** supplied usage counts are logged without sensitive text

### Requirement: Integrated retrieval and assistant workspace
The system MUST expose existing class-scoped retrieval, answers and protected original sources through the material workspace using the documented retrieval and model interfaces.

#### Scenario: Retrieval navigation
- **WHEN** a user searches with keyword, vector or hybrid mode and navigates to another workspace section and back
- **THEN** the submitted search, results, pagination and errors remain available
- **AND** each result can open the full material or its highlighted original source

#### Scenario: Reader and question page
- **WHEN** a user opens the reader-side assistant or the question page
- **THEN** both present existing displayed exchanges and allow independent questions through POST /api/ask
- **AND** only the current question is sent as question input to the API

#### Scenario: Independent errors and sources
- **WHEN** retrieval or answering fails
- **THEN** the actual error is displayed on its affected surface without replacing unrelated successful results
- **AND** failed questions remain available for correction and no fabricated answer is substituted
- **WHEN** a user opens and closes a cited original source
- **THEN** the protected material's exact Unicode range is highlighted and closing the dialog leaves the workspace usable

### Requirement: Configurable material processing
The system MUST support auto, custom and Markdown hierarchy chunking while preserving uploaded originals.

#### Scenario: Upload and rebuild
- **WHEN** a teacher selects a strategy on upload or rebuild
- **THEN** the selected strategy controls chunk boundaries and replaces the previous index
- **AND** custom length, overlap, separators and preprocessing are validated
- **AND** source navigation uses original text coordinates

#### Scenario: Inspect retrieval
- **WHEN** an authorized user inspects material chunks or retrieval results
- **THEN** chunk identity, source ranges, index state and retrieval ranks are available
- **AND** keyword retrieval remains usable independently of Qdrant
