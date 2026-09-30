## MODIFIED Requirements

### Requirement: Material ingestion and download
The system MUST accept teacher uploads of UTF-8 txt/md files no larger than 2 MiB and store material metadata and knowledge text atomically, then build a retrievable index.

#### Scenario: Upload and read
- **WHEN** a teacher uploads a valid file
- **THEN** materials and knowledge_entries are committed for the teacher's class
- **AND** successful indexing marks the material ready for retrieval
- **AND** same-class users can read and download identical bytes

#### Scenario: Index service failure
- **WHEN** indexing fails after material storage
- **THEN** the response explicitly reports that storage succeeded but indexing failed
- **AND** the original material remains accessible and can be indexed again by its class teacher

#### Scenario: Invalid upload
- **WHEN** the extension, size, encoding or contents violate existing limits
- **THEN** the existing 415, 413 or 400 response leaves neither material rows nor files

#### Scenario: Database failure
- **WHEN** database insertion fails during material storage
- **THEN** both table changes roll back, the new file is removed and an explicit 500 response is returned

#### Scenario: Authorized files only
- **WHEN** someone requests a file without a valid token or from another class
- **THEN** the download returns 401 or 404 without file content
- **AND** no public uploads path exposes files
