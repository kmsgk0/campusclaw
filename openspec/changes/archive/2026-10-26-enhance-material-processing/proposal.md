## Why

Teachers need control over how material is divided for retrieval and a way to inspect the resulting chunks before using them in answers.

## What Changes

- Add automatic, custom-window and Markdown-heading chunk strategies on upload and rebuild.
- Validate length, overlap, separators and preprocessing while preserving uploaded originals.
- Expose chunk identity, source ranges, index status and retrieval ranks in the material workspace.
- Keep keyword retrieval available independently of the vector service.

## Capabilities

### Modified Capabilities
- `knowledge-search`: configurable processing, index inspection and traceable retrieval.

## Dependencies

Build on `add-class-knowledge-search` and the material controls introduced by `replace-material-workspace`.

## Impact

Update chunking, indexing, material APIs and the upload/index controls. Preserve stored materials, source navigation and existing search and answer contracts.
