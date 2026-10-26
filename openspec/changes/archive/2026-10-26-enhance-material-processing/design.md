## Context

Materials already have original text, keyword indexes, vectors and cited answers. Teachers need to inspect and adjust chunk boundaries without replacing the source document.

## Decisions

- Separate chunk construction into `chunking.py` and retain indexing and retrieval in `knowledge.py`.
- Support automatic windows, configurable windows and Markdown heading sections. Validate custom length, overlap and separators before rebuilding.
- Apply optional preprocessing to retrieval text while mapping each chunk back to the original Unicode character range.
- Replace the material's previous index when its strategy changes. Reuse successful embeddings only when text, provider, model, dimension and class match.
- Show strategy controls on upload and rebuild, and expose chunk details through the material API and interface.
- Keep keyword retrieval independent of Qdrant; report vector and indexing failures explicitly.

## Verification

Check strategy boundaries, preprocessing/source mapping, chunk inspection, index failure and retry, and keyword retrieval with the vector service unavailable. Verify upload and rebuild controls and original-source navigation in the workspace.
