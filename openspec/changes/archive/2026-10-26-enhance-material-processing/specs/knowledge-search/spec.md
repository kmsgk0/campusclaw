## ADDED Requirements

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

## MODIFIED Requirements

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
