# ai-service

Python / FastAPI / LlamaIndex / Ollama / LanceDB

## Responsibility
- Runs the RAG pipeline against the local LanceDB vector store
- Generates grounded answers using a locally running Ollama LLM
- Returns `{ answer, sources, raw_context }` to the api-gateway

## Routes
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health + Ollama reachability check |
| POST | /query | RAG query → answer + sources |
| POST | /ingest | Trigger document ingestion |

## Setup
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Pull local model (run once)
ollama pull llama3.2:3b
ollama pull nomic-embed-text

# 3. Copy env
cp ../../.env.example .env

# 4. Run
python main.py
```

## First-run ingestion
Place PDFs and markdown files inside `data/raw-docs/`, then call:
```
POST http://localhost:8001/ingest
```
