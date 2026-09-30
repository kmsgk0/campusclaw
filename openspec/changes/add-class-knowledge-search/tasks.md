## 1. Paragraph data
- [ ] 1.1 Add knowledge_chunks and foreign-key/unique constraints. verify: schema inspection and duplicate-insert rejection.
- [ ] 1.2 Implement paragraph splitting and historical backfill. verify: CRLF, blank paragraphs and repeated backfill preserve original positions without duplicate rows.
- [ ] 1.3 Include chunk writes in the existing upload transaction. verify: injected insertion failure rolls back all rows and cleans the file.

## 2. Retrieval API
- [ ] 2.1 Implement GET /api/search with session-derived class filtering. verify: A/B matching fixtures, student/teacher access, missing-session 401 and forged class parameter.
- [ ] 2.2 Implement literal matching, query validation and pagination. verify: Chinese/English phrases, empty query 400, no matches, and more than 20 matches across pages without omissions.
- [ ] 2.3 Return source fields and protected source URLs. verify: each paragraph matches the original file location and cross-class source access returns 404.

## 3. Interface and delivery
- [ ] 3.1 Add the search form, result list, empty state and source navigation. verify: actual browser queries and source opening at desktop and mobile sizes.
- [ ] 3.2 Check existing login, class isolation, upload and download behavior. verify: existing pytest suite and Compose persistence checks still pass.
- [ ] 3.3 Add README usage and captured retrieval examples. verify: another reader can reproduce own-class hits, no hits and cross-class rejection.
- [ ] 3.4 Run strict validation and archive after implementation. verify: openspec validate passes, scenarios have evidence, and main specs gain knowledge-search only after completion.
