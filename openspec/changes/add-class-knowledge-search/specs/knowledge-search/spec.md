## Purpose

帮助师生在自己的班级材料中查找匹配段落，并能核对材料原文及位置。

## ADDED Requirements

### Requirement: Class-scoped knowledge retrieval
The system MUST allow authenticated teachers and students to search material paragraphs belonging only to their own class using a literal keyword or phrase.

#### Scenario: Search own class
- **WHEN** an A-class user searches a phrase present in an A-class paragraph
- **THEN** the matching paragraph is returned with its material source
- **AND** matching B-class paragraphs MUST NOT appear, even if a class_id parameter is supplied

#### Scenario: Unauthenticated search
- **WHEN** a request has no valid session
- **THEN** the search API returns 401 without titles, paragraphs or source identifiers

### Requirement: Traceable sources
Each result MUST contain the material identity, title, original filename, paragraph index, source line range and an authenticated original-material URL.

#### Scenario: Verify a result against its source
- **WHEN** a user opens a search result's source
- **THEN** the matching paragraph and its position can be found in the original material
- **AND** the returned paragraph text MUST come from stored material content rather than generated text

#### Scenario: Source authorization
- **WHEN** a B-class user attempts to open an A-class source URL
- **THEN** the existing source endpoint returns 404 without the material content

### Requirement: Explicit query and result states
The system MUST validate empty queries, return explicit empty results and allow pagination through all matches.

#### Scenario: Empty query
- **WHEN** the query is empty or whitespace only
- **THEN** the API returns 400 with a readable prompt to enter a keyword

#### Scenario: No matching paragraphs
- **WHEN** no authorized paragraph contains the requested phrase
- **THEN** results is an empty array and total is zero
- **AND** the page displays 本班知识库中没有找到相关内容 without inventing an answer or source

#### Scenario: Complete pagination
- **WHEN** more than 20 authorized paragraphs match
- **THEN** each page contains at most 20 results, with accurate total and has_more
- **AND** following every page returns all matches without duplicates or omissions

### Requirement: Consistent paragraph ingestion
Paragraph records MUST be derived from persisted material text and remain consistent with uploads and historical data.

#### Scenario: Upload and query
- **WHEN** a teacher uploads a supported document successfully
- **THEN** its paragraph records are committed with the material and become searchable by same-class users
- **AND** any transaction failure leaves no partial material or paragraph rows

#### Scenario: Idempotent historical backfill
- **WHEN** the migration runs twice on existing materials
- **THEN** each nonempty paragraph appears once and its original order and source positions are preserved
- **AND** existing source files and material class ownership are unchanged
