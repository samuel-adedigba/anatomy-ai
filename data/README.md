# data/

## Structure

| Folder | Purpose |
|--------|---------|
| `raw-docs/` | Drop PDFs, `.txt`, `.md` medical documents here for ingestion |
| `processed/` | Chunked + metadata-enriched intermediate files (auto-generated) |
| `vector-db/` | LanceDB embedded storage (auto-created on first ingest) |

## Ingestion flow
1. Add documents to `raw-docs/`
2. Call `POST http://localhost:8000/ingest` (ai-service)
3. LanceDB index is created/updated in `vector-db/`

## Recommended seed documents
- NICE headache guidelines (PDF)
- MedlinePlus anatomy articles (downloaded HTML → converted to MD)
- PubMed Open Access Subset articles on target anatomy systems
- Your own curated educational content

## Notes
- `vector-db/` should be added to `.gitignore` (binary, large)
- `raw-docs/` source documents should be version-controlled if curated
- Always track document source and license in a `raw-docs/sources.md` file
